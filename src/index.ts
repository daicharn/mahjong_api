import express from "express";
import cors from "cors";
import {Hai} from 'mahjong_engine';
import {Hais} from 'mahjong_engine';
import {BlockDivider} from 'mahjong_engine';
import {PlayerHand} from 'mahjong_engine';
import {PlayerContext} from 'mahjong_engine';
import {ScoreResolver} from 'mahjong_engine';
import {YakuContext} from 'mahjong_engine';
import {YakuChecker} from 'mahjong_engine';
import {TILE} from 'mahjong_engine';
import {ScoreResult} from 'mahjong_engine';
import {Meld} from "mahjong_engine";
import {MeldType} from "mahjong_engine";
import { Wind } from "mahjong_engine/dist/tileDefs";

type meldJSON = {type: MeldType, hais: number[]};

const app = express();
app.use(express.json());
app.use(cors());

app.post("/calc", (req, res) => {
    const haiIds: number[] = req.body.haiIds;
    const melds: meldJSON[] = req.body.melds;
    const meldObjs: Meld[] = melds.map(m => new Meld(m.hais.map(id => new Hai(id)), m.type));
    const agariHaiId: number = req.body.agariHaiId;
    const isTsumo: boolean = req.body.isTsumo;
    const playerWind: Wind = req.body.playerWind;
    const roundWind: Wind = req.body.roundWind;

    const hais = new Hais(haiIds);
    const hand = new PlayerHand(hais.getHais(), [...meldObjs]);
    const ctx = new PlayerContext({agariHai: new Hai(agariHaiId), isTsumo: isTsumo, playerWind: playerWind, roundWind: roundWind});
    const blocks = new BlockDivider(hais.getHais()).divide();
    if(blocks.length < 1){
        return res.json({ error: "no blocks" });
    }
    let contextMax: YakuContext = new YakuContext(hand, ctx, blocks[0]!);
    let yakuMapMax: Map<string, number> = new YakuChecker(contextMax).check();
    if(yakuMapMax.size < 1){
        return res.json({ error: "no yaku" });
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

    const blockObj = contextMax.block;

    const fuDetailObj = scoreResultMax.fuDetail.map(fd => ({
        name: fd.name,
        fu: fd.fu,
        mentsuType: fd.mentsu?.getType(),
        minHaiId: fd.mentsu?.minHai.getId()
    }));


    const scoreResultObj = ({
        han: scoreResultMax.han,
        fuBasic: scoreResultMax.fuBasic,
        fuCeiled: scoreResultMax.fuCeiled,
        tensuu: scoreResultMax.tensuu,
        fuDetail: fuDetailObj
    });

    return res.json({blockObj, yakuMapObj, scoreResultObj});
});

app.listen(3000, () =>{
    console.log("Server running");
});

