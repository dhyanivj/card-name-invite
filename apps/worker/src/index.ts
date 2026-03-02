import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { processInvitation } from './processor';

dotenv.config();

// Initialize BullMQ Worker
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker('invitation-queue', async (job) => {
    console.log(`Processing job ${job.id}:`, job.name);

    if (job.name === 'process-invitation') {
        await processInvitation(job.data);
    }
}, { connection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with ${err.message}`);
});

console.log('Worker Service Started (PDF Generation Only)...');
