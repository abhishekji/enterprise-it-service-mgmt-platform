import { Kafka, logLevel } from 'kafkajs';

process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

let kafka;
let producer;

function getKafka(clientId) {
  if (!kafka) {
    kafka = new Kafka({
      clientId,
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      logLevel: logLevel.WARN,
      retry: { retries: 10, initialRetryTime: 500 },
    });
  }
  return kafka;
}

export async function ensureTopics(clientId, topics) {
  const admin = getKafka(clientId).admin();
  await admin.connect();
  await admin.createTopics({ topics: topics.map((topic) => ({ topic })), waitForLeaders: true });
  await admin.disconnect();
}

export async function initProducer(clientId) {
  producer = getKafka(clientId).producer({ allowAutoTopicCreation: true });
  await producer.connect();
  console.log(`[${clientId}] Kafka producer connected`);
}

export async function publish(topic, payload, key) {
  if (!producer) throw new Error('Kafka producer not initialised');
  await producer.send({
    topic,
    messages: [
      {
        key: key ? String(key) : undefined,
        value: JSON.stringify({ ...payload, _emittedAt: new Date().toISOString() }),
      },
    ],
  });
}

// handlers: { [topic]: async (payload) => void }
export async function startConsumer(clientId, groupId, handlers) {
  const topics = Object.keys(handlers);
  await ensureTopics(clientId, topics);

  const consumer = getKafka(clientId).consumer({ groupId });
  await consumer.connect();
  for (const topic of topics) await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        await handlers[topic](JSON.parse(message.value.toString()));
      } catch (err) {
        console.error(`[${clientId}] handler for ${topic} failed:`, err.message);
      }
    },
  });
  console.log(`[${clientId}] Kafka consumer subscribed: ${topics.join(', ')}`);
}
