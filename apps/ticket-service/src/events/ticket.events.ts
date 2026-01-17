import { config as loadEnv } from "dotenv";
import { resolve } from "path";
loadEnv({ path: resolve(process.cwd(), "../../../.env") });

import { getConfig } from "@ticketing/config";
import { createKafkaClient, createProducer, TOPICS } from "@ticketing/events";
import type { TicketEvent } from "@ticketing/types";

let producer: ReturnType<typeof createProducer> | null = null;

async function getProducer() {
  if (!producer) {
    const config = getConfig();
    const kafka = createKafkaClient(config.KAFKA_BROKERS);
    producer = createProducer(kafka);
  }
  return producer;
}

export async function emitTicketEvent(event: TicketEvent) {
  try {
    const prod = await getProducer();
    await prod.send(TOPICS.TICKET_EVENTS, event);
  } catch (error) {
    console.error("Failed to emit ticket event:", error);
  }
}

