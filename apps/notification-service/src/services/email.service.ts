import nodemailer from "nodemailer";
import handlebars from "handlebars";
import type { Env } from "@ticketing/config";
import type { Logger } from "@ticketing/logger";
import type { TicketEvent } from "@ticketing/types";
import { readFileSync } from "fs";
import { join } from "path";

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private config: Env,
    private logger: Logger,
  ) {
    if (
      config.SMTP_HOST &&
      config.SMTP_PORT &&
      config.SMTP_USER &&
      config.SMTP_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    retries = 3,
  ) {
    if (!this.transporter) {
      this.logger.warn("SMTP not configured, skipping email");
      return;
    }

    for (let i = 0; i < retries; i++) {
      try {
        await this.transporter.sendMail({
          from: this.config.SMTP_FROM || this.config.SMTP_USER,
          to,
          subject,
          html,
        });
        this.logger.info({ to, subject }, "Email sent successfully");
        return;
      } catch (error) {
        this.logger.error({ error, attempt: i + 1 }, "Failed to send email");
        if (i < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 1000),
          );
        }
      }
    }
  }

  private renderTemplate(templateName: string, data: Record<string, unknown>) {
    try {
      const templatePath = join(
        process.cwd(),
        "src",
        "templates",
        `${templateName}.hbs`,
      );
      const templateSource = readFileSync(templatePath, "utf-8");
      const template = handlebars.compile(templateSource);
      return template(data);
    } catch (error) {
      this.logger.error({ error, templateName }, "Failed to render template");
      return `<p>${JSON.stringify(data)}</p>`;
    }
  }

  async sendTicketCreated(event: TicketEvent) {
    const html = this.renderTemplate("ticket-created", {
      ticket_number: event.data.ticket_number,
      subject: event.data.subject,
      ticket_id: event.data.ticket_id,
    });

    await this.sendEmail(
      "customer@example.com",
      `Ticket Created: ${event.data.ticket_number}`,
      html,
    );
  }

  async sendAgentReply(event: TicketEvent) {
    const html = this.renderTemplate("agent-reply", {
      ticket_id: event.data.ticket_id,
      message_id: event.data.message_id,
    });

    await this.sendEmail(
      "customer@example.com",
      "New Reply to Your Ticket",
      html,
    );
  }

  async sendStatusChange(event: TicketEvent) {
    const html = this.renderTemplate("status-change", {
      ticket_id: event.data.ticket_id,
      status: event.data.status,
      previous_status: event.data.previous_status,
    });

    await this.sendEmail(
      "customer@example.com",
      "Ticket Status Updated",
      html,
    );
  }
}









