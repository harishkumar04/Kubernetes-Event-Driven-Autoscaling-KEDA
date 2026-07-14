const amqp = require("amqplib");

async function sendOrders() {
    try {
        console.log("Connecting...");

        const connection = await amqp.connect(
            "amqp://guest:guest@127.0.0.1:5672"
        );

        console.log("✅ Connected");

        const channel = await connection.createChannel();

        console.log("✅ Channel Created");

        const queue = "orders";

        await channel.assertQueue(queue);

        console.log("✅ Queue Ready");

        for (let i = 1; i <= 5; i++) {
            channel.sendToQueue(
                queue,
                Buffer.from(`Order ${i}`)
            );

            console.log(`Sent Order ${i}`);
        }

        await channel.close();
        await connection.close();

        console.log("Done");
    } catch (err) {
        console.error(err);
    }
}

sendOrders();
