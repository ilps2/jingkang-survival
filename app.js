/* ============================================================
   汴京生存指南 v6 · 小红书小工具版引擎
   适配规则（fe 小工具开发者文档）：
   - 纯离线：事件数据经 <script src> 注入 window.EVENTS_X，禁止 fetch
   - 无内联脚本/行内事件：全部 addEventListener
   - 分享：xhs.miniTool.writeTempFile + postNote；浏览器预览降级为下载
   ============================================================ */

/* 全局错误兜底：资源或脚本异常时在加载屏给出可读提示 */
window.addEventListener("error",function(e){
  var p=document.getElementById("load-err");
  var cover=document.querySelector("#s-cover.active");
  if(!cover && p){p.textContent="载入出错："+(e.message||(e.target&&e.target.src)||"资源加载失败");}
  var ld=document.getElementById("s-loading");
  if(!cover && ld) ld.classList.add("active");
},true);

const CONFIG = {
  jobs: ["落魄书生","染坊之女","矾楼侍女","夜市学徒","药铺杂役","行脚商人"],
  skills: ["识字断文","心算记账","医理药理","厨艺烹饪","妆扮手艺","蹴鞠武艺",
           "琴棋书画","商贾之道","农桑常识","工巧制作","相面识人","酒令应酬"],
  styles: [
    {id:"lowkey", name:"低调蛰伏", desc:"少说话多做事，先活下来"},
    {id:"social", name:"广结善缘", desc:"见人就笑，朋友多了路好走"},
    {id:"bold",   name:"敢闯敢赌", desc:"富贵险中求，汴京遍地是机会"},
    {id:"elegant",name:"风雅自持", desc:"宁可清贫，不可无趣"}
  ],
  branches: {
    A:{name:"🌸 生活美学", data:"EVENTS_A", char:"assets/char-A.jpg", role:"染坊之女"},
    B:{name:"💄 妆容时尚", data:"EVENTS_B", char:"assets/char-B.jpg", role:"樊楼侍女"},
    C:{name:"📚 知识成长", data:"EVENTS_C", char:"assets/char-C.jpg", role:"抄书表妹"},
    D:{name:"🍜 美食探店", data:"EVENTS_D", char:"assets/char-D.jpg", role:"夜市学徒"},
    E:{name:"💪 健身养生", data:"EVENTS_E", char:"assets/char-E.jpg", role:"药铺杂役"}
  },
  totalDays: 174,
  heresyMax: 2,
  saveKey: "bjsczn_save_v6_minitool"
};

/* rare 为静态稀有度描述（离线环境无计数后端，按预设写死） */
const ENDINGS = {
  nandu:    {emoji:"🕯️", title:"南渡",   rare:"约三成玩家走到此结局", hook:"我活到了南宋，但汴京只活到 1127。",
             source:"靖康二年春，金人掳二帝北去，士民南渡者数十万。孟元老南渡后追忆故都，著《东京梦华录》。"},
  liushou:  {emoji:"🔥", title:"留守",   rare:"敢闯者才有的结局", hook:"城破那天，我在州桥摆了最后一晚摊。",
             source:"靖康元年闰十一月，汴京陷落——《续资治通鉴长编》注引。"},
  jilu:     {emoji:"📜", title:"记录者", rare:"不足一成的玩家把汴京写进了书里", hook:"我把汴京写进了书里，后来它叫《东京梦华录》。",
             source:"《东京梦华录》序：「暗想当年，节物风流，人情和美，但成怅恨。」"},
  baolu:    {emoji:"💀", title:"暴露",   rare:"大多数穿越者的真实归宿", hook:"我躲过了柴米油盐，没躲过一句错话。",
             source:"宋代重「妖言」之禁，言语诡异者里甲可径行拘拿。穿越者，慎言。"},
  yuanman:  {emoji:"🌸", title:"圆满",   rare:"最难得的结局，只有生活美学线的风雅之人可达", hook:"我见过了它最好的样子。",
             source:"宣和年间，汴京人口逾百万，「八荒争凑，万国咸通」——《东京梦华录》。"}
};

const NOTE_PRESET = {
  title: "我在北宋汴京活了174天",
  content: "测测你穿越回宣和年间的汴京能活几天。我躲过了行会、物价和暴露，最后没躲过1127……5种身份5种结局，你是哪一种？",
  tags: "#小红书vibecoding大赛 #国风vibecoding #宋朝 #穿越 #互动游戏"
};

/* 里程碑：非阻塞分享卡（doc 要求端能力必须用户手势触发，故做成印章落下+主动分享） */
const MILESTONES = [
  {day:10,  emoji:"🍵", title:"汴京新客",   hook:"十天前我连铜钱都不认得，现在我会跟摊主讨价还价了。", rare:"约六成穿越者活不过这一天"},
  {day:30,  emoji:"🏮", title:"半个月京人", hook:"行会认得我了，大娘子留我吃饭了，我有点像汴京人了。", rare:"只有三成穿越者走到这里"},
  {day:100, emoji:"📜", title:"大宋居民",   hook:"一百天。我已经开始害怕，害怕失去这座城。", rare:"百里挑一的存活纪录"}
];

/* 感情线走到深处时，结局卡钩子追加专属一句 */
const ROMANCE_HOOK = {
  nandu:"只是替我留灯的人，留在了汴京。",
  liushou:"最后一晚，摊前坐着他。",
  jilu:"书里有一页，我不敢重读。",
  baolu:"到死都不知道，他后来找过我。",
  yuanman:"最好的年华里，有他。"
};

const UI = {
  go(id){
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo(0,0);
  },
  el(tag, cls, html){
    const e=document.createElement(tag);
    if(cls) e.className=cls;
    if(html!=null) e.innerHTML=html;
    return e;
  }
};

const Engine = {
  state:null,

  init(){
    document.getElementById("btn-start").addEventListener("click", ()=>UI.go("s-route"));
    document.getElementById("btn-resume").addEventListener("click", ()=>Engine.resume());
    document.getElementById("btn-share").addEventListener("click", ()=>Engine.share());
    document.getElementById("btn-replay").addEventListener("click", ()=>Engine.reset());
    document.getElementById("btn-stamp-share").addEventListener("click", ()=>Engine.shareStamp());
    document.getElementById("btn-stamp-continue").addEventListener("click", ()=>Engine.renderEvent());
    document.getElementById("btn-stamps").addEventListener("click", ()=>Engine.renderStamps());
    document.getElementById("btn-stamps-back").addEventListener("click", ()=>{
      if(Engine.state && Engine.state.events.length && !Engine.state.ended) Engine.renderEvent();
      else UI.go("s-cover");
    });
    document.getElementById("skill-next").addEventListener("click", ()=>{
      if(Engine.state.skills.length===2) UI.go("s-style");
    });

    const jl=document.getElementById("job-list");
    CONFIG.jobs.forEach(j=>{
      const b=UI.el("button","btn",j);
      b.addEventListener("click",()=>{Engine.state=Engine.blankState(); Engine.state.job=j; UI.go("s-skill");});
      jl.appendChild(b);
    });

    const sl=document.getElementById("skill-list");
    const picked=new Set();
    CONFIG.skills.forEach(s=>{
      const b=UI.el("button","btn",s);
      b.addEventListener("click",()=>{
        if(picked.has(s)){picked.delete(s);b.classList.remove("primary");}
        else if(picked.size<2){picked.add(s);b.classList.add("primary");}
        document.getElementById("skill-count").textContent=picked.size+"/2";
        document.getElementById("skill-next").disabled = picked.size!==2;
        Engine.state && (Engine.state.skills=[...picked]);
      });
      sl.appendChild(b);
    });

    const yl=document.getElementById("style-list");
    CONFIG.styles.forEach(s=>{
      const b=UI.el("button","btn",`${s.name}<br><small style="color:var(--faint)">${s.desc}</small>`);
      b.addEventListener("click",()=>{Engine.state.style=s.id; UI.go("s-route");});
      yl.appendChild(b);
    });

    const bl=document.getElementById("branch-list");
    Object.entries(CONFIG.branches).forEach(([k,v])=>{
      const ready = typeof window[v.data] !== "undefined";
      const b=UI.el("button","btn char-card",
        `<img class="char-img" src="${v.char}" alt="${v.role}">
         <span class="char-name">${v.name}</span>
         <span class="char-role">${v.role} · ${ready?"174 天 · 专属结局":"即将开放"}</span>`);
      if(!ready){ b.disabled=true; b.style.opacity=".45"; }
      else b.addEventListener("click",()=>Engine.start(k));
      bl.appendChild(b);
    });

    const saved=localStorage.getItem(CONFIG.saveKey);
    if(saved){
      document.getElementById("btn-resume").style.display="block";
      try{
        const s=JSON.parse(saved);
        if(s && (s.stamps&&s.stamps.length || s.ended))
          document.getElementById("btn-stamps").style.display="block";
      }catch{}
    }
  },

  blankState(){
    return {job:null,skills:[],style:null,branch:null,events:[],idx:0,day:1,
            heresy:0,playerTags:{},ended:null,_sideHist:[],stamps:[]};
  },

  /* ---------- 开局：数据从 window.EVENTS_X 读取，零网络 ---------- */
  start(branchKey){
    UI.go("s-loading");
    if(!this.state) this.state = this.blankState();
    this.state.branch = branchKey;
    try{
      const data = window[CONFIG.branches[branchKey].data];
      if(!Array.isArray(data) || !data.length) throw new Error("事件库未打包");
      this.validate(data, branchKey);
      // 时辰制：先按天，再按时辰顺序（子丑寅卯辰巳午未申酉戌亥）
      const SHICHEN="子丑寅卯辰巳午未申酉戌亥";
      this.state.events = [...data].sort((a,b)=>
        a.day-b.day ||
        SHICHEN.indexOf((a.shichen||"?")[0])-SHICHEN.indexOf((b.shichen||"?")[0]));
      this.save();
      this.renderEvent();
    }catch(e){
      alert("事件库载入出错："+e.message);
      UI.go("s-route");
    }
  },

  validate(events, branchKey){
    const ids=new Set(), checkpoints=new Set();
    for(const ev of events){
      if(!ev.id||!ev.scene||!Array.isArray(ev.options)||ev.options.length!==2)
        throw new Error("事件结构不完整: "+(ev.id||"未知"));
      if(ids.has(ev.id)) throw new Error("事件 id 重复: "+ev.id);
      ids.add(ev.id);
      const corr=ev.options.filter(o=>o.correct);
      if(ev.finale || ev.flavor){ // 终局/夜话：双正确，不判对错
        if(corr.length<1) throw new Error("终局/夜话事件至少1个正确选项: "+ev.id);
      }else if(corr.length!==1) throw new Error("每事件必须恰好1个正确选项: "+ev.id);
      if(ev.checkpoint) checkpoints.add(ev.checkpoint);
    }
    const dup=events.length-checkpoints.size;
    if(events.length>0 && dup/events.length>0.05)
      console.warn("⚠️ 考点重复率超 5%");
  },

  renderEvent(){
    const st=this.state;
    if(st.idx>=st.events.length || st.day>CONFIG.totalDays){
      return this.end(this.routeEnding());
    }
    const ev=st.events[st.idx];
    UI.go("s-play");
    document.getElementById("hud-day").textContent=`第 ${ev.day} 天`;
    document.getElementById("hud-shichen").textContent=ev.shichen||"";
    document.getElementById("hud-heresy").textContent=st.heresy;
    document.getElementById("hud-bar").style.width=(st.idx/st.events.length*100)+"%";
    document.getElementById("ev-stag").textContent=`${CONFIG.branches[st.branch].name} · 第 ${ev.stage||"-"} 阶段`;
    document.getElementById("ev-scene").textContent=ev.scene;
    document.getElementById("ev-feedback").innerHTML="";

    let correctFirst = Math.random()<0.5;
    const hist=st._sideHist;
    const last2=hist.slice(-2);
    if(last2.length===2 && last2[0]===last2[1]) correctFirst=!last2[0];
    hist.push(correctFirst);

    const opts=[...ev.options].sort((a,b)=>{
      const ac=a.correct?1:0, bc=b.correct?1:0;
      return correctFirst? bc-ac : ac-bc;
    });

    const box=document.getElementById("ev-opts");
    box.innerHTML="";
    opts.forEach(o=>{
      const b=UI.el("button","btn opt",o.text);
      b.addEventListener("click",()=>this.choose(ev,o,b,box));
      box.appendChild(b);
    });
    this.save();
  },

  choose(ev,opt,btn,box){
    const st=this.state;
    [...box.children].forEach(c=>c.disabled=true);
    btn.classList.add(opt.correct?"good":"bad");

    (opt.tags||[]).forEach(t=>{
      st.playerTags[t]=(st.playerTags[t]||0)+(opt.correct?2:1);
    });

    if(!opt.correct){
      st.heresy++;
      document.getElementById("hud-heresy").textContent=st.heresy;
    }

    const fb=UI.el("div","feedback"+(opt.correct?"":" err"),
      (opt.correct?"✅ ":"❌ ")+opt.feedback+
      (opt.source?`<div class="src">${opt.source}</div>`:""));
    document.getElementById("ev-feedback").appendChild(fb);

    const next=UI.el("button","btn primary",
      (st.heresy>=CONFIG.heresyMax)?"……":"继续");
    next.style.marginTop="12px";
    next.addEventListener("click",()=>{
      st.idx++; st.day=ev.day;
      if(st.heresy>=CONFIG.heresyMax) return this.end("baolu");
      this.save();
      // 里程碑检测：非阻塞印章卡（越过节点当天即触发）
      const hit=MILESTONES.find(m=>ev.day>=m.day && !st.stamps.includes(m.day) && m.day> (st._lastMilestoneDay||0));
      if(hit){ st._lastMilestoneDay=hit.day; this.save(); this.showStamp(hit); return; }
      this.renderEvent();
    });
    document.getElementById("ev-feedback").appendChild(next);
    this.save();
  },

  routeEnding(){
    const st=this.state;
    const tags=st.playerTags;
    const aesthetic=(tags["审美"]||0)+(tags["雅集"]||0)+(tags["穿搭"]||0);
    if(st.branch==="A" && aesthetic>=20) return "yuanman";
    if((tags["书写"]||0)+(tags["记录"]||0)+(tags["书法"]||0)>=14) return "jilu";
    if((tags["社交"]||0)>=80) return "liushou"; // 广结善缘者，城破时选择留下
    return "nandu";
  },

  end(key){
    const st=this.state; st.ended=key; this.save();
    const e=ENDINGS[key];
    UI.go("s-end");
    document.getElementById("end-stag").textContent="靖康二年 · 春";
    document.getElementById("end-emoji").textContent=e.emoji;
    document.getElementById("end-title").textContent=e.title;
    document.getElementById("end-days").textContent=`你在汴京活了 ${st.day} 天`;
    document.getElementById("end-rare").textContent=e.rare;
    const romance=(st.playerTags["感情"]||0)>=6;
    const hookText="「"+e.hook+(romance?ROMANCE_HOOK[key]:"")+"」";
    document.getElementById("end-hook").textContent=hookText;
    document.getElementById("end-source").textContent=e.source;
    document.getElementById("share-hint").textContent="";
    const tl=document.getElementById("end-tags"); tl.innerHTML="";
    Object.entries(st.playerTags).sort((a,b)=>b[1]-a[1]).slice(0,4)
      .forEach(([t])=>tl.appendChild(UI.el("span","",t)));
  },

  /* ---------- 分享：Canvas 2D 手绘结局卡（无第三方依赖，沙箱内最稳） ---------- */
  loadImage(src, timeout=3000){
    return new Promise((res,rej)=>{
      const img=new Image();
      const t=setTimeout(()=>rej(new Error("img timeout")),timeout);
      img.onload=()=>{clearTimeout(t);res(img);};
      img.onerror=()=>{clearTimeout(t);rej(new Error("img load fail"));};
      img.src=src;
    });
  },

  drawEndCard(endKey, banner){
    const e=ENDINGS[endKey], st=this.state;
    const W=1080,H=1440,cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const C={paper:"#FAF8F5",ink:"#1A1A1A",charcoal:"#4A4540",faint:"#8A8478",cinnabar:"#B5544A",gamboge:"#C9A84C",stoneblue:"#5A7A8A",wash:"#E8E4DC"};
    const SERIF='"Noto Serif SC","Songti SC",serif';
    // 底色
    g.fillStyle=endKey==="yuanman"?"#FBF6EA":endKey==="baolu"?"#F3F0EA":C.paper;
    g.fillRect(0,0,W,H);
    // 双线框
    g.strokeStyle=C.ink; g.lineWidth=5; g.strokeRect(44,44,W-88,H-88);
    g.strokeStyle=C.faint; g.lineWidth=2; g.strokeRect(58,58,W-116,H-116);
    // 顶部
    g.fillStyle=C.faint; g.font=`38px ${SERIF}`; g.textAlign="left";
    g.fillText("我在汴京活不过三天",100,140);
    g.fillStyle=C.gamboge; g.textAlign="right";
    g.fillText("靖康二年 · 春",W-100,140);
    // 结局 emoji + 标题
    g.textAlign="center"; g.font="150px serif";
    g.fillText(e.emoji,W/2,360);
    g.fillStyle=endKey==="liushou"?C.cinnabar:endKey==="nandu"?C.stoneblue:endKey==="yuanman"?C.gamboge:C.ink;
    g.font=`700 110px ${SERIF}`;
    g.fillText(e.title,W/2,540);
    // 存活天数
    g.fillStyle=C.charcoal; g.font=`40px ${SERIF}`;
    g.fillText(`你在汴京活了 ${st.day} 天`,W/2,630);
    // 稀有度
    g.fillStyle=C.faint; g.font=`28px ${SERIF}`;
    g.fillText(e.rare,W/2,680);
    // 五人合图横幅（cover 裁剪；无图时跳过，版式自动收拢）
    let yCursor=700;
    if(banner){
      const bx=100, bw=W-200, bh=220, by=yCursor;
      const ir=banner.width/banner.height, tr=bw/bh;
      let sw,sh,sx,sy;
      if(ir>tr){ sh=banner.height; sw=sh*tr; sx=(banner.width-sw)/2; sy=0; }
      else{ sw=banner.width; sh=sw/tr; sx=0; sy=(banner.height-sh)*0.25; }
      g.save();
      roundRect(g,bx,by,bw,bh,16); g.clip();
      g.drawImage(banner,sx,sy,sw,sh,bx,by,bw,bh);
      g.restore();
      g.strokeStyle=C.wash; g.lineWidth=2;
      roundRect(g,bx,by,bw,bh,16); g.stroke();
      yCursor=by+bh+50;
    }
    // 钩子文案（居中，自动换行；感情线深入时追加专属句）
    g.fillStyle=C.charcoal; g.font=`46px ${SERIF}`;
    const romance=(st.playerTags["感情"]||0)>=6;
    wrapText(g,"「"+e.hook+(romance?ROMANCE_HOOK[endKey]:"")+"」",W/2,yCursor+40,W-260,72);
    // tags
    const tags=Object.entries(st.playerTags).sort((a,b)=>b[1]-a[1]).slice(0,4).map(t=>t[0]);
    g.font=`28px ${SERIF}`;
    const tagY=yCursor+150;
    let tw=tags.reduce((s,t)=>s+g.measureText(t).width+70,0), tx=W/2-tw/2;
    tags.forEach(t=>{
      const w=g.measureText(t).width;
      g.strokeStyle=C.stoneblue; g.lineWidth=2;
      roundRect(g,tx,tagY,w+44,52,26); g.stroke();
      g.fillStyle=C.stoneblue; g.fillText(t,tx+22+w/2,tagY+38);
      tx+=w+70;
    });
    // 出处
    g.fillStyle=C.faint; g.font=`26px ${SERIF}`; g.textAlign="left";
    g.strokeStyle=C.wash; g.lineWidth=1; g.beginPath(); g.moveTo(100,H-260); g.lineTo(W-100,H-260); g.stroke();
    wrapText(g,"📚 "+e.source,100,H-205,W-200,44,"left");
    // 底部引流
    g.fillStyle=C.ink; g.font=`32px ${SERIF}`;
    g.textAlign="left"; g.fillText("5 种身份 × 5 种结局",100,H-120);
    g.fillStyle=C.cinnabar; g.fillText("你在汴京能活几天？",100,H-70);
    return cv;

    function wrapText(g,text,x,y,maxW,lh,align="center"){
      g.textAlign=align; let line="",yy=y;
      for(const ch of text){
        if(g.measureText(line+ch).width>maxW){
          g.fillText(line,align==="center"?x:x,yy); line=ch; yy+=lh;
        }else line+=ch;
      }
      if(line) g.fillText(line,x,yy);
    }
    function roundRect(g,x,y,w,h,r){
      g.beginPath();
      g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
      g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
    }
  },

  async share(){
    const miniTool = window.xhs && window.xhs.miniTool;
    const hint = document.getElementById("share-hint");
    hint.textContent="正在生成结局卡……";
    try{
      const banner = await this.loadImage("assets/group.jpg").catch(()=>null);
      const cv = this.drawEndCard(this.state.ended||"nandu", banner);
      const dataUrl = cv.toDataURL("image/png");
      if(miniTool){
        // 大图先落临时文件，再唤起发布页（文档 §3.5 推荐路径）
        const { filePath } = await miniTool.writeTempFile({ data: dataUrl });
        await miniTool.postNote({
          title: NOTE_PRESET.title,
          content: NOTE_PRESET.content,
          tags: NOTE_PRESET.tags,
          mediaInfo: { image_resources: [{ url: filePath }] }
        });
        hint.textContent="已带入发布页，加两句你的感想再发，数据会更好";
      }else{
        // 浏览器/无 SDK 环境降级：直接保存
        const a=document.createElement("a");
        a.download="我在汴京活不过三天-结局卡.png";
        a.href=dataUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
        hint.textContent="结局卡已生成（预览环境，小工具内将直接唤起发笔记）";
      }
    }catch(err){
      hint.textContent="生成失败，请再试一次";
      console.warn(err && err.errMsg || err);
    }
  },

  /* ---------- 里程碑印章卡 ---------- */
  showStamp(m){
    const st=this.state;
    if(!st.stamps.includes(m.day)) st.stamps.push(m.day);
    this.save();
    document.getElementById("stamp-emoji").textContent=m.emoji;
    document.getElementById("stamp-title").textContent=m.title;
    document.getElementById("stamp-days").textContent=`汴京生存 · 第 ${m.day} 天`;
    document.getElementById("stamp-hook").textContent="「"+m.hook+"」";
    document.getElementById("stamp-rare").textContent=m.rare;
    document.getElementById("stamp-hint").textContent="";
    this._currentStamp=m;
    UI.go("s-stamp");
  },

  drawStampCard(m){
    const st=this.state;
    const W=900,H=1200,cv=document.createElement("canvas");
    cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const C={paper:"#FAF8F5",ink:"#1A1A1A",charcoal:"#4A4540",faint:"#8A8478",cinnabar:"#B5544A",gamboge:"#C9A84C"};
    const SERIF='"Noto Serif SC","Songti SC",serif';
    g.fillStyle=C.paper; g.fillRect(0,0,W,H);
    g.strokeStyle=C.ink; g.lineWidth=4; g.strokeRect(36,36,W-72,H-72);
    g.strokeStyle=C.faint; g.lineWidth=1.5; g.strokeRect(48,48,W-96,H-96);
    g.textAlign="center";
    g.fillStyle=C.faint; g.font=`30px ${SERIF}`;
    g.fillText("汴 京 生 存 指 南",W/2,130);
    // 印章
    g.save(); g.translate(W/2,300); g.rotate(0.06);
    g.fillStyle=C.cinnabar; g.globalAlpha=.92;
    g.beginPath(); g.roundRect(-110,-110,220,220,14); g.fill();
    g.globalAlpha=1; g.fillStyle=C.paper; g.font=`64px ${SERIF}`;
    const t=m.title; g.fillText(t.slice(0,2),0,-18); g.fillText(t.slice(2),0,58);
    g.restore();
    g.font="100px serif"; g.fillText(m.emoji,W/2,540);
    g.fillStyle=C.ink; g.font=`56px ${SERIF}`;
    g.fillText(`第 ${m.day} 天`,W/2,650);
    g.fillStyle=C.charcoal; g.font=`36px ${SERIF}`;
    // 钩子换行
    const hook="「"+m.hook+"」"; let line="",yy=740;
    for(const ch of hook){
      if(g.measureText(line+ch).width>W-200){ g.fillText(line,W/2,yy); line=ch; yy+=58; }
      else line+=ch;
    }
    if(line) g.fillText(line,W/2,yy);
    g.fillStyle=C.faint; g.font=`26px ${SERIF}`;
    g.fillText(m.rare,W/2,yy+70);
    g.fillText("5 种身份 × 5 种结局 · 你在汴京能活几天",W/2,H-90);
    return cv;
  },

  async shareStamp(){
    const m=this._currentStamp; if(!m) return;
    const miniTool = window.xhs && window.xhs.miniTool;
    const hint=document.getElementById("stamp-hint");
    hint.textContent="正在盖章……";
    try{
      const dataUrl=this.drawStampCard(m).toDataURL("image/png");
      if(miniTool){
        const { filePath } = await miniTool.writeTempFile({ data: dataUrl });
        await miniTool.postNote({
          title:`汴京生存第${m.day}天｜${m.title}`,
          content:`穿越回北宋汴京的第 ${m.day} 天，我拿到了「${m.title}」。${m.hook} 你能活几天？`,
          tags:NOTE_PRESET.tags,
          mediaInfo:{ image_resources:[{url:filePath}] }
        });
        hint.textContent="已带入发布页";
      }else{
        const a=document.createElement("a");
        a.download=`汴京生存-第${m.day}天.png`; a.href=dataUrl;
        document.body.appendChild(a); a.click(); a.remove();
        hint.textContent="印章卡已生成（预览环境，小工具内将直接唤起发笔记）";
      }
    }catch(err){
      hint.textContent="生成失败，请再试一次";
      console.warn(err && err.errMsg || err);
    }
  },

  renderStamps(){
    const st=this.state;
    const list=document.getElementById("stamps-list"); list.innerHTML="";
    const got=(st&&st.stamps)||[];
    document.getElementById("stamps-count").textContent=got.length+"/"+(MILESTONES.length+1);
    MILESTONES.forEach(m=>{
      const has=got.includes(m.day);
      const b=UI.el("button","btn",
        `${has?m.emoji:"🔒"} ${m.title} · 第${m.day}天`+
        (has?` <small style="color:var(--stoneblue)">点我分享</small>`:`<small style="color:var(--faint)">未达成</small>`));
      if(has) b.addEventListener("click",()=>this.showStamp(m));
      else { b.disabled=true; b.style.opacity=".45"; }
      list.appendChild(b);
    });
    if(st&&st.ended){
      const e=ENDINGS[st.ended];
      const b=UI.el("button","btn",`${e.emoji} 结局「${e.title}」 <small style="color:var(--stoneblue)">点我分享</small>`);
      b.addEventListener("click",()=>{ UI.go("s-end"); });
      list.appendChild(b);
    }
    UI.go("s-stamps");
  },

  save(){ if(this.state) localStorage.setItem(CONFIG.saveKey, JSON.stringify(this.state)); },
  resume(){
    try{
      this.state=JSON.parse(localStorage.getItem(CONFIG.saveKey));
      if(!this.state||!this.state.events||!this.state.events.length) throw 0;
      if(!this.state._sideHist) this.state._sideHist=[];
      if(!this.state.stamps) this.state.stamps=[];
      if(this.state.ended){ this.end(this.state.ended); return; }
      this.renderEvent();
    }catch{ localStorage.removeItem(CONFIG.saveKey); location.reload(); }
  },
  reset(){ localStorage.removeItem(CONFIG.saveKey); location.reload(); }
};

Engine.init();
