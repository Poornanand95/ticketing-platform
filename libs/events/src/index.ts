import { Kafka, Producer, Consumer, EachMessagePayload } from "kafkajs";
import type { TicketEvent } from "@ticketing/types";

export interface EventProducer {
  send(topic: string, event: TicketEvent): Promise<void>;
  disconnect(): Promise<void>;
}

export interface EventConsumer {
  subscribe(topics: string[]): Promise<void>;
  run(handler: (event: TicketEvent) => Promise<void>): Promise<void>;
  disconnect(): Promise<void>;
}

export function createKafkaClient(brokers: string | string[]) {
  return new Kafka({
    clientId: "ticketing-platform",
    brokers: Array.isArray(brokers) ? brokers : brokers.split(","),
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  });
}

export function createProducer(kafka: Kafka): EventProducer {
  const producer = kafka.producer();

  return {
    async send(topic: string, event: TicketEvent) {
      await producer.connect();
      await producer.send({
        topic,
        messages: [
          {
            key: event.data.ticket_id,
            value: JSON.stringify(event),
          },
        ],
      });
    },
    async disconnect() {
      await producer.disconnect();
    },
  };
}

export function createConsumer(
  kafka: Kafka,
  groupId: string,
): EventConsumer {
  const consumer = kafka.consumer({ groupId });

  return {
    async subscribe(topics: string[]) {
      await consumer.connect();
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
    },
    async run(handler: (event: TicketEvent) => Promise<void>) {
      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            const value = payload.message.value?.toString();
            if (!value) return;

            const event = JSON.parse(value) as TicketEvent;
            await handler(event);
          } catch (error) {
            console.error("Error processing event:", error);
          }
        },
      });
    },
    async disconnect() {
      await consumer.disconnect();
    },
  };
}

export const TOPICS = {
  TICKET_EVENTS: "ticket.events",
  NOTIFICATION_QUEUE: "notification.queue",
  AUTOMATION_QUEUE: "automation.queue",
  SLA_BREACHES: "sla.breaches",
} as const;

