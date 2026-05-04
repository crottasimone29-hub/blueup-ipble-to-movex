const express = require("express");
const config = require("./config");

const PORT = 3099;

const app = express();

function formatDataForMovex(data) {
    if (!data) return;

    return {
        gateway: data.gateway,
        packets: data.data.beacons
            .filter((beacon) => beacon.ibeacon && beacon.ibeacon.length > 0)
            .map((beacon) => ({
                mac: beacon.bdaddr,
                rssi: beacon.rssi,
                timestamp: beacon.timestamp,
            })),
    };
}

app.use(express.json());

app.use((req, res, next) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }
    next();
});

app.post("/ibeacons", (req, res) => {

    const formatted = formatDataForMovex(req.body);
    console.log("Formatted:", JSON.stringify(formatted, null, 2));

    res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Listening on http://0.0.0.0:${PORT}`);
});