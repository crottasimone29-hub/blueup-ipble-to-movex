const express = require("express");
const https = require("https");

const PORT = 3099;

const app = express();

function formatDataForMovex(data) {
    if (!data) return;

    return {
        gateway: "b827ebffdff2",
        packets: data.data.beacons
            .filter((beacon) => beacon.ibeacon && beacon.ibeacon.length > 0)
            .map((beacon) => ({
                mac: beacon.bdaddr,
                rssi: beacon.rssi,
                timestamp: beacon.timestamp,
            })),
    };
}

function sendToMovex(beaconData) {
    const movexApiUrl = "https://movex.awswitch.com/api/v01/pdr";
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
        console.log(`Headers:`, serverResponse.headers);
        
        let responseBody = "";
        
        serverResponse.on("data", (chunk) => {
            responseBody += chunk.toString();
        });
        
        serverResponse.on("end", () => {
            try {
                const parsedResponse = JSON.parse(responseBody);
                console.log(`Response Body:`, JSON.stringify(parsedResponse, null, 2));
            } catch (error) {
                console.log(`Response Body:`, responseBody);
            }
            console.log(`======================\n`);
        });
    });
    
    httpsRequest.on("error", (error) => {
        console.error("Error sending data to MovEx:", error);
    });
    
    httpsRequest.write(requestPayload);
    httpsRequest.end();
}

app.use(express.json());

app.use((req, res, next) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }
    next();
});

app.post("/ibeacons", (req, res) => {

    const rawData = req.body; 
    console.log("Received Data:", JSON.stringify(rawData, null, 2));

    const formatted = formatDataForMovex(req.body);
    console.log("Formatted:", JSON.stringify(formatted, null, 2));

    sendToMovex(formatted);

    res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Listening on http://0.0.0.0:${PORT}`);
});