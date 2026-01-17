import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@ticketing/db";
import type { Logger } from "@ticketing/logger";
import { attachments, tickets } from "@ticketing/db";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class AttachmentService {
  private s3Client: S3Client | null = null;

  constructor(
    private db: NodePgDatabase<typeof schema>,
    private config: {
      S3_ENDPOINT?: string;
      S3_ACCESS_KEY?: string;
      S3_SECRET_KEY?: string;
      S3_BUCKET?: string;
    },
    private logger: Logger,
  ) {
    if (config.S3_ENDPOINT && config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
      this.s3Client = new S3Client({
        endpoint: config.S3_ENDPOINT,
        credentials: {
          accessKeyId: config.S3_ACCESS_KEY,
          secretAccessKey: config.S3_SECRET_KEY,
        },
        region: "us-east-1",
        forcePathStyle: true,
      });
    }
  }

  async generatePresignedUrl(
    ticketId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    orgId: string,
  ) {
    if (!this.s3Client || !this.config.S3_BUCKET) {
      throw new Error("S3 not configured");
    }

    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket || ticket.org_id !== orgId) {
      throw new Error("Ticket not found");
    }

    const s3Key = `tickets/${ticketId}/${nanoid()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.config.S3_BUCKET,
      Key: s3Key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 900,
    });

    return { url, s3Key };
  }

  async createAttachment(data: {
    ticket_id: string;
    message_id?: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    s3_key: string;
    uploaded_by: string;
    org_id: string;
  }) {
    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, data.ticket_id))
      .limit(1);

    if (!ticket || ticket.org_id !== data.org_id) {
      throw new Error("Ticket not found");
    }

    const [attachment] = await this.db
      .insert(attachments)
      .values({
        id: nanoid(),
        ticket_id: data.ticket_id,
        message_id: data.message_id || null,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
        s3_key: data.s3_key,
        uploaded_by: data.uploaded_by,
      })
      .returning();

    return attachment;
  }

  async getAttachmentUrl(attachmentId: string, orgId: string) {
    if (!this.s3Client || !this.config.S3_BUCKET) {
      throw new Error("S3 not configured");
    }

    const [attachment] = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      throw new Error("Attachment not found");
    }

    const [ticket] = await this.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, attachment.ticket_id))
      .limit(1);

    if (!ticket || ticket.org_id !== orgId) {
      throw new Error("Access denied");
    }

    const command = new GetObjectCommand({
      Bucket: this.config.S3_BUCKET,
      Key: attachment.s3_key,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return url;
  }
}

