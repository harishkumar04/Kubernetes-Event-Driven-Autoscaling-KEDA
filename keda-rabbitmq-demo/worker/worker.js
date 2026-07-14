const amqp = require("amqplib");

const QUEUE = "orders";

async function startWorker() {

    console.log("Connecting to RabbitMQ...");

    const connection = await amqp.connect(
        "amqp://guest:guest@rabbitmq:5672"
    );

    console.log("Connected!");

    const channel = await connection.createChannel();

    console.log("Channel created");

    await channel.assertQueue(QUEUE);

    console.log("Waiting for orders...");

    channel.consume(QUEUE, async (msg) => {

        if (!msg) return;

        const order = msg.content.toString();

        console.log("================================");
        console.log("Received:", order);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve,5000));

        console.log("Finished:", order);

        channel.ack(msg);

    });

}

startWorker().catch(console.error);
