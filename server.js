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
  let data = new FormData();
  const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
  data.append("file", blob, { filename: req.file.originalname });
  data.append("isSync", "true");

  //https://docs.starton.com/docs/ipfs/uploading-on-ipfs
  async function uploadImgOnIpfs() {
    const ipfsImg = await starton.post("/v3/ipfs/file", data, {
      header: {
        "Content-type": `multipart/form-data; boundary=${data._boundary}`,
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

    const ipfsMetadata = await starton.post("/v3/ipfs/json", {
      name: "My NFT Metadata JSON",
      content: metadataJson,
      isSync: true,
    });
    return ipfsMetadata.data;
  }

  async function mintNFT(receiverAddress, metadataCid) {
    const nft = await starton.post(
      `/v3/smart-contract/${process.env.SMART_CONTRACT_NETWORK}/${process.env.SMART_CONTRACT_ADDRESS}/call`,
      {
        functionName: "mint",
        signerWallet: `${process.env.WALLET_IMPORT_ON_STARTON}`,
        speed: "low",
        params: [receiverAddress, metadataCid],
      }
    );
    return nft.data;
  }
  const RECEIVER_ADDRESS = "0x834D1A80154FB0497E0aA995b90c27572ADE89c8";
  const ipfsImgData = await uploadImgOnIpfs();
  const ipfsMetadata = await uploadDataOnIpfs(ipfsImgData.cid);
  const mint = await mintNFT(RECEIVER_ADDRESS, ipfsMetadata.cid);
  // console.log(ipfsImgData, ipfsMetadata);
  res.status(200).json({
    transactionHash: mint.transactionHash,
    cid: ipfsImgData.cid,
  });
});

app.listen(port, () => {
  console.log("Server is running on port " + port);
});
