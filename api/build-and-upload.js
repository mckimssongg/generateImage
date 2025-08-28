import { createCanvas, loadImage } from "@napi-rs/canvas";
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    const W = 600, H = 220;

    const r = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
    const ids = [r(1,826), r(1,826), r(1,826)];
    const data = await fetch(`https://rickandmortyapi.com/api/character/${ids.join(",")}`).then(r=>r.json());
    const chars = Array.isArray(data) ? data : [data];

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0b0e14"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px sans-serif";
    ctx.fillText("Rick & Morty — snapshot", 10, 22);

    const gap=10, cardW=Math.floor((W-gap*4)/3), imgH=150, y=30;
    for (let i=0;i<3;i++){
      const c = chars[i], x = gap + i*(cardW+gap);
      ctx.fillStyle="#101826"; roundRect(ctx,x-1,y-1,cardW+2,imgH+50,10); ctx.fill();
      const img = await loadImage(c.image);
      ctx.drawImage(img,x,y,cardW,imgH);
      ctx.fillStyle="#fff"; ctx.font="12px sans-serif";
      ctx.fillText(trunc(c.name, Math.floor(cardW/7)), x+6, y+imgH+18);
      ctx.fillStyle = c.status==="Alive" ? "#9fe870" : (c.status==="Dead" ? "#ff8080" : "#b9c1d6");
      ctx.fillText(c.status, x+6, y+imgH+34);
    }
    ctx.fillStyle="#95a1b2"; ctx.font="11px monospace";
    ctx.fillText("Build: "+new Date().toISOString(),10,H-8);

    const buffer = canvas.toBuffer("image/png");

    const { url } = await put("rm-live.png", buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png"
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok:true, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:String(e) });
  }
}

function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();
ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);
ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function trunc(s,m){return s.length>m?s.slice(0,m-1)+"…":s;}
