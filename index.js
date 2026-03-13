require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs/promises");
const app = express();
const PORT = 9000;
const { spawn } = require("child_process");

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.get("/test", (req, res) => {
  res.send("TEST API WORKS !!!");
});

app.get("/copyFolder", async (req, res) => {
  const result = await copyFolder();
  return res.json(result);
});

async function copyFolder() {
  // internalAPI
  //   const source = "C:\\Projects\\Ridosoft\\ridosoft_internalapi_node_local";
  //   const destination = "N:\\Temp\\3/copied-folders/internalAPI";

  // poc
  //   const source = "C:\\Projects\\_POC\\Ridosoft";
  //   const destination = "N:\\Temp\\3/copied-folders/POC";

  // WORK
  const source = "C:\\Users\\user\\Desktop\\Work";
  const destination = "N:\\Temp\\3/copied-folders/work";
  try {
    await fs.cp(source, destination, {
      recursive: true,
      filter: (src) => !src.includes("node_modules"),
    });

    console.log("Folder copied successfully");
    return { success: true, message: "Folder copied successfully" };
  } catch (err) {
    console.error("Error copying folder:", err);
    return {
      success: false,
      message: "Error copying folder",
      error: err.message,
    };
  }
}

function runFreeFileSync(exePath, batchPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, [batchPath], { shell: false });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => {
      out += d.toString();
    });

    child.stderr.on("data", (d) => {
      err += d.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (err.trim()) {
        return reject(new Error(err));
      }

      try {
        const json = JSON.parse(out);
        resolve({ exitCode: code, ...json });
      } catch {
        reject(
          new Error(
            `Invalid JSON from FreeFileSync. Exit code ${code}. Output: ${out}`,
          ),
        );
      }
    });
  });
}

function isNothingToSync(result) {
  if (!result) return false;

  if (result.processedItems === 0) return true;
  if (result.processedBytes === 0) return true;

  return false;
}

const exe = "C:\\Program Files\\FreeFileSync\\FreeFileSync.exe";
const batchFile =
  "C:\\Users\\user\\Desktop\\FreeFileSyncBatches\\BatchRunWork.ffs_batch";

let isRunning = false;
let runnerId = null;
let lastRunResult = null;

async function scheduledSync(exe, batchFile) {
  if (isRunning) {
    const msg = `[${new Date().toISOString()}] Previous sync still running. Skipping.`;
    console.log(msg);
    return { success: false, message: msg };
  }

  isRunning = true;

  try {
    const result = await runFreeFileSync(exe, batchFile);

    if (isNothingToSync(result)) {
      const response = {
        success: true,
        message: "No changes found. Nothing to sync.",
        result,
      };
      console.log(`[${new Date().toISOString()}] No changes found.`);
      lastRunResult = response;
      return response;
    }

    const response = {
      success: true,
      message: "Sync completed.",
      result,
    };
    console.log(`[${new Date().toISOString()}] Sync completed.`, result);
    lastRunResult = response;
    return response;
  } catch (error) {
    const response = {
      success: false,
      message: error.message,
    };
    console.error(`[${new Date().toISOString()}] Sync failed:`, error.message);
    lastRunResult = response;
    return response;
  } finally {
    isRunning = false;
  }
}

app.get("/freeFilySyncMirror", async (req, res) => {
  try {
    const result = await runFreeFileSync(exe, batchFile);

    if (isNothingToSync(result)) {
      return res.json({
        success: true,
        message: "No changes found. Nothing to sync.",
        result,
      });
    }

    return res.json({
      success: true,
      message: "Sync completed.",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/freeFilySyncMirrorRunner", async (req, res) => {
  if (runnerId) {
    return res.json({
      success: false,
      message: "Runner is already active.",
    });
  }

  // run once
  await scheduledSync(exe, batchFile);

  //every 2 minutes
  runnerId = setInterval(
    () => {
      scheduledSync(exe, batchFile);
    },
    2 * 60 * 1000,
  );

  return res.json({
    success: true,
    message: "Runner started. Sync will run every 2 minutes.",
  });
});

app.get("/freeFilySyncMirrorStop", (req, res) => {
  if (!runnerId) {
    return res.json({
      success: false,
      message: "Runner is not active.",
    });
  }

  clearInterval(runnerId);
  runnerId = null;

  return res.json({
    success: true,
    message: "Runner stopped.",
  });
});

app.get("/freeFilySyncMirrorStatus", (req, res) => {
  return res.json({
    success: true,
    runnerActive: !!runnerId,
    lastRunResult,
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
