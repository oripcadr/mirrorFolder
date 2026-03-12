require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs/promises");
const app = express();
const PORT = 9000;

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
  const source = "C:\\Projects\\Ridosoft\\ridosoft_internalapi_node_local";
  const destination = "N:\\Temp\\3/copied-folders/internalAPI";

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
