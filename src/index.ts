import express from "express"
import {Hai} from 'mahjong_engine';
import {Hais} from 'mahjong_engine';
import {Melds} from 'mahjong_engine';
import {BlockDivider} from 'mahjong_engine';
import {PlayerHand} from 'mahjong_engine';
import {PlayerContext} from 'mahjong_engine';
import {ScoreResolver} from 'mahjong_engine';
import {YakuContext} from 'mahjong_engine';
import {YakuChecker} from 'mahjong_engine';
import {TILE} from 'mahjong_engine';
import {ScoreResult} from 'mahjong_engine';


const app = express();
app.use(express.json());

app.post("/calc", (req, res) => {
    const { haiIds } = req.body;

    const hais = new Hais(haiIds);
    const melds = new Melds();
    const hand = new PlayerHand(hais.getHais(), [...melds]);
    const ctx = new PlayerContext({agariHai: new Hai(5), isTsumo: true, playerWind: TILE.WIND.EAST, roundWind: TILE.WIND.EAST});
    const blocks = new BlockDivider(hais.getHais()).divide();
    if(blocks.length < 1){
        res.json({ error: "no blocks" });
    }
    let contextMax: YakuContext = new YakuContext(hand, ctx, blocks[0]!);
    let yakuMapMax: Map<string, number> = new YakuChecker(contextMax).check();
    if(yakuMapMax.size < 1){
        res.json({ error: "no yaku" });
    }
    let scoreResultMax: ScoreResult = new ScoreResolver(contextMax, yakuMapMax).resolve();;
    for(let i = 1; i < blocks.length; i++){
        const context = new YakuContext(hand, ctx, blocks[i]!);
        const yakuMap = new YakuChecker(context).check();
        const scoreResult = new ScoreResolver(context, yakuMap).resolve();

        if(scoreResultMax.han < scoreResult.han || scoreResultMax.tensuu.base < scoreResult.tensuu.base){
        contextMax = context;
        yakuMapMax = yakuMap;
        scoreResultMax = scoreResult;
        }
    }

    const yakuMapObj = Object.fromEntries(yakuMapMax);
    res.json({contextMax, yakuMapObj, scoreResultMax});
});

app.listen(3000, () =>{
    console.log("Server running");
});

