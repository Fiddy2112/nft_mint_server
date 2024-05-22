const express = require("express");
const multer = require("multer"); // dealing with the uploaded file
const cors = require("cors"); // cross-origin request
const axios = require("axios"); // communicating with https://app.starton.com/
const dotenv = require("dotenv");
dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
});

const starton = axios.create({
  baseURL: "https://api.starton.com",
  headers: {
    "x-api-key": `${process.env.API_KEY}`,
  },
});

app.post("/upload", cors(), upload.single("file"), async (req, res) => {
  let data = FormData();
  const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
  data.append("file", blob, { filename: req.file.originalname });
  data.append("isSync", "true");

  //https://docs.starton.com/docs/ipfs/uploading-on-ipfs
  async function uploadImgOnIpfs() {
    const ipfsImg = await starton.post("/v3/ipfs/file", data, {
      header: {
        "Content-type": `multipart/form-data; boundary=${data.getBoundary()}`,
      },
    });
    return ipfsImg.data;
  }

  //https://docs.starton.com/docs/ipfs/uploading-json
  async function uploadDataOnIpfs(imgId) {
    const metadataJson = {
      name: "new NFT",
      description: "create new NFT",
      image: `ipfs://ipfs/${imgId}`,
    };

    const ipfsMetadata = await starton.port("/v3/ipfs/json", {
      name: "My NFT Metadata JSON",
      content: metadataJson,
      isSync: true,
    });
    return ipfsMetadata.data;
  }

  const ipfsImgData = await uploadImgOnIpfs();
  const ipfsMetadata = await uploadDataOnIpfs(ipfsImgData.cid);
  console.log(ipfsImgData, ipfsMetadata);
});
