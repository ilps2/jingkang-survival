/* ============================================================
   一屏自适应（3:4 宽度驱动舞台）
   舞台宽=屏宽（≤480px），高=宽×4/3。当某屏内容超出舞台可用高度时，
   对该屏整体做等比 transform: scale 缩放（缩放比=可用高/内容高），
   保证任何界面一屏全展示、不出现内部上下滚动条。
   纯附加模块：不改游戏逻辑、不碰 events 数据。
   （缩放通过 MutationObserver 同步触发，不依赖 rAF，无头/低端机都稳。）
   ============================================================ */
(function(){
  var app=document.getElementById("app");
  if(!app) return;
  var lastEl=null, lastVal="";

  function fit(){
    var scr=app.querySelector(".screen.active");
    if(!scr) return;
    var cs=getComputedStyle(app);
    var avail=app.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    if(avail<=0) return;
    // scrollHeight 是布局量，不受 transform 影响，可带着旧缩放直接测量
    var need=scr.scrollHeight;
    var s=(need>avail+1)?Math.max(avail/need,0.5):1;
    var val=s<0.999?("scale("+s.toFixed(4)+")"):"";
    if(scr===lastEl && val===lastVal) return;  // 不变不重设，观察器不会自激
    lastEl=scr; lastVal=val;
    scr.style.transform=val;
  }

  // 切屏（class 变化）与动态内容渲染（子树变化）后同步重算
  new MutationObserver(fit).observe(app,{
    subtree:true, childList:true, attributes:true,
    attributeFilter:["class","style"]
  });
  window.addEventListener("resize",fit);
  window.addEventListener("orientationchange",fit);
  window.addEventListener("load",fit);
  // 图片载入完成会改变内容高度（捕获阶段才能拿到 img 的 load/error）
  document.addEventListener("load",fit,true);
  document.addEventListener("error",fit,true);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
  document.addEventListener("DOMContentLoaded",fit);
  fit();
})();
