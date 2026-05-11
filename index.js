const express = require("express");
const https = require("https");
const PORT = 3099;
const app = express();

function formatDataForMovex(data) {
    if (!data || !data.data || !Array.isArray(data.data.beacons)) {
        return null;
    }

    const packets = data.data.beacons
        .filter((beacon) => beacon && Array.isArray(beacon.ibeacon) && beacon.ibeacon.length > 0)
        .map((beacon) => ({
            mac: beacon.bdaddr,
            rssi: beacon.rssi,
            timestamp: new Date(beacon.timestamp).getTime(),
        }))
        .filter((packet) => packet.mac && typeof packet.rssi === "number" && packet.timestamp);

    if (packets.length === 0) {
        return {
            gateway: "b827ebffdff2",
            packets,
        };
    }

    return {
        gateway: "b827ebffdff2",
        packets,
    };
}

function sendToMovex(beaconData) {
    const requestPayload = JSON.stringify(beaconData);

    const httpsOptions = {
        hostname: "movex.awswitch.com",
        path: "/api/v01/collect",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(requestPayload),
            "from": "BCareEVAQ",
        },
    };

    const httpsRequest = https.request(httpsOptions, (serverResponse) => {
        console.log(`\n=== MovEx Response ===`);
        console.log(`Status Code: ${serverResponse.statusCode}`);

        let responseBody = "";

        serverResponse.on("data", (chunk) => {
            responseBody += chunk.toString();
        });

        serverResponse.on("end", () => {
            try {
                const parsedResponse = JSON.parse(responseBody);
                console.log(`Response Body:`, JSON.stringify(parsedResponse, null, 2));
            } catch {
                console.log(`Response Body:`, responseBody);
            }
            console.log(`======================\n`);
        });
    });

    httpsRequest.setTimeout(5000, () => {
        console.error("MovEx request timed out");
        httpsRequest.destroy();
    });

    httpsRequest.on("error", (error) => {
        console.error("Error sending data to MovEx:", error.message);
    });

    httpsRequest.write(requestPayload);
    httpsRequest.end();
}

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }
    next();
});

app.post("/ibeacons", (req, res) => {
    const rawData = req.body;
    console.log("Received Data:", JSON.stringify(rawData, null, 2));

    const formatted = formatDataForMovex(rawData);
    if (!formatted) {
        console.warn("Invalid beacon payload received.");
        return res.status(400).json({ status: "error", message: "Invalid payload." });
    }

    console.log("Formatted:", JSON.stringify(formatted, null, 2));
    sendToMovex(formatted);
    res.status(200).json({ status: "ok" });
});

app.use((req, res) => res.status(404).json({ status: "error", message: "Not found" }));

app.listen(PORT, () => {
    console.log(`Listening on http://0.0.0.0:${PORT}`);
});