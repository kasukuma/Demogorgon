let inFrame

try {
    inFrame = window !== top
} catch (e) {
    inFrame = true
}

// Cloaking Code
if (!inFrame && !navigator.userAgent.includes("Firefox")) {
    const popup = open("about:blank", "_blank")
    if (!popup || popup.closed) {
    } else {
        const doc = popup.document
        const iframe = doc.createElement("iframe")
        const style = iframe.style
        const link = doc.createElement("link")

        const name = localStorage.getItem("name") || "taisaku";
        const icon = localStorage.getItem("icon") || "https://cdn.glitch.global/0613af7e-1287-4cc5-82d6-2cf4a331136e/taisaku.png?v=1733667132449";
        
        doc.title = name;
        link.rel = "icon";
        link.href = icon;
        
        iframe.src = location.href 
        style.position = "fixed"
        style.top = style.bottom = style.left = style.right = 0
        style.border = style.outline = "none"
        style.width = style.height = "100%"

        doc.head.appendChild(link);
        doc.body.appendChild(iframe)
        location.replace("https://student.atama.plus/public/login/")
    }
}

document.addEventListener("DOMContentLoaded", function(event) { 
    if(window.localStorage.getItem("v4Particles") == "true") {
      const scr = document.createElement("script");
      scr.src="/scripts/academia.js";
      document.body.appendChild(scr);
    }
  });
