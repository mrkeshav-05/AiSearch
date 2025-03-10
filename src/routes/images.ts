import express from 'express';
import imageSearchChain from '../agents/imageSearchAgent';

const router = express.Router();

router.post("/", async (req, res) => {
  try{
    const {query, chat_history} = req.body;

    const images = await imageSearchChain.invoke({
      chat_history,
      query,
    })
    res.status(200).json({images});
  }catch(err){
    res.status(500).json({message: "An error has occurred."});
    if (err instanceof Error) {
      console.log(err.message);
    } else {
      console.log(String(err));
    }
  }
});


export default router;