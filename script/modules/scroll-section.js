!function(){let e={duration:.75,ease:"power3.out",stepVh:42,useSnap:!0,titleGapRem:{mobile:1.5,desktop:3},titleActiveShiftRem:{mobile:.5,desktop:2},modal:{open:{backdropDuration:.38,backgroundDuration:.9,maskDuration:.82,contentDuration:.62,contentStagger:.045,contentStart:.18,contentShift:window.innerWidth<=768?20:54},close:{backdropDuration:.3,backgroundDuration:.48,maskDuration:.44,contentDuration:.27,contentStagger:.01,contentShift:window.innerWidth<=768?20:46}}};function t(t){let n=e[t];return"object"==typeof n&&null!==n&&"mobile"in n?window.innerWidth<=768?n.mobile:n.desktop:n}function n(e){let t=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;return t*e}function o(){return window.matchMedia("(hover: none), (pointer: coarse)").matches||navigator.maxTouchPoints>0}function i(){if(!o())return window.innerHeight;let e=document.createElement("div");e.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 1px;
    height: 100svh;
    visibility: hidden;
    pointer-events: none;
    z-index: -9999;
  `,document.documentElement.appendChild(e);let t=e.getBoundingClientRect().height;return e.remove(),Math.round(t||document.documentElement.clientHeight||window.innerHeight)}async function l(){if(!window.gsap||!window.ScrollTrigger){console.warn("GSAP or ScrollTrigger is not loaded");return}if(window.ScrollToPlugin?gsap.registerPlugin(ScrollTrigger,ScrollToPlugin):gsap.registerPlugin(ScrollTrigger),document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(e){console.warn("Fonts ready error:",e)}document.querySelectorAll(".solutions-scroll").forEach(r)}function r(n){if("true"===n.dataset.solutionsReady)return;n.dataset.solutionsReady="true";let l=Array.from(n.querySelectorAll(".solution-cms-item")),r=l.map(function(e){var t;let n=e.querySelector(".solution-cms-title"),o=e.querySelector(".solution-cms-img"),i=e.querySelector(".solution-cms-caption"),l=e.querySelector(".solution-cms-popup-title"),r=e.querySelector(".solution-cms-popup-rich");return{title:n?n.textContent.trim():"",image:(t=o,t&&(t.currentSrc||t.getAttribute("src")||t.getAttribute("data-src"))||""),alt:o&&o.getAttribute("alt")||"",caption:i?i.textContent.trim():"",popupTitle:l?l.textContent.trim():i?i.textContent.trim():"",popupHtml:r?r.innerHTML.trim():""}}).filter(function(e){return e.title&&e.image});if(!r.length){console.warn("No valid .solution-cms-item found");return}let d=r.length,$=n.querySelector(".solution-image-stage"),p=n.querySelector(".solutions-title-list"),m=n.querySelector(".solution-caption"),f=n.querySelector(".solution-more"),_=n.querySelector(".solutions-step"),g=n.querySelector(".solutions-label");if(!$||!p){console.warn("Missing .solution-image-stage or .solutions-title-list");return}let h,v=(h=document.querySelector(".solution-modal"),h?(s(h),h):(h&&!h.querySelector(".solution-modal-panel-bg")&&(h.remove(),h=null),h||((h=document.createElement("div")).className="solution-modal",h.setAttribute("aria-hidden","true"),h.innerHTML=`
        <div
          class="solution-modal-backdrop"
          data-solution-modal-close
        ></div>

        <div
          class="solution-modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="solution-modal-title"
        >
          <div
            class="solution-modal-panel-bg"
            aria-hidden="true"
          ></div>

          <div
            class="solution-modal-content-mask"
          >
            <div class="solution-modal-inner">
              <button
                class="solution-modal-close"
                type="button"
                aria-label="Close"
                data-solution-modal-close
                data-modal-animate
              >
                <svg class="close-button-svg" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.0204 0.292893C13.4109 -0.0975498 14.044 -0.0973872 14.4345 0.292893C14.825 0.683417 14.825 1.31643 14.4345 1.70696L8.77727 7.36321L14.4345 13.0204C14.825 13.411 14.825 14.044 14.4345 14.4345C14.044 14.825 13.411 14.825 13.0204 14.4345L7.36321 8.77727L1.70696 14.4355C1.31649 14.8257 0.683356 14.8257 0.292893 14.4355C-0.0976311 14.0449 -0.0976311 13.411 0.292893 13.0204L5.94914 7.36321L0.292893 1.70696C-0.0976311 1.31643 -0.0976311 0.683417 0.292893 0.292893C0.683417 -0.0976311 1.31643 -0.0976311 1.70696 0.292893L7.36321 5.94914L13.0204 0.292893Z" fill="black"/>
</svg>

              </button>

              <div
                class="solution-modal-meta"
                data-modal-animate
              >
                <span>WHO IS IT FOR ?</span>

                <span
                  class="solution-modal-dot"
                ></span>

                <span
                  class="solution-modal-category"
                ></span>
              </div>

              <h2
                id="solution-modal-title"
                class="solution-modal-title"
                data-modal-title-animate
              ></h2>

              <div
                class="solution-modal-content"
                data-modal-animate
              ></div>
            </div>
          </div>
        </div>
      `,document.body.appendChild(h),h.addEventListener("click",function(e){let t=e.target.closest("[data-solution-modal-close]");t&&(e.preventDefault(),u(h))}),document.addEventListener("keydown",function(e){"Escape"===e.key&&h.classList.contains("is-open")&&(e.preventDefault(),u(h))}),s(h)),h));$.innerHTML="",p.innerHTML="";let y=[],S=[],w=-1,b=null,E=null,L=i(),T=document.documentElement.clientWidth,O=!1,k=null;function A(t){t=gsap.utils.clamp(0,d-1,t),v.setAttribute("data-item-index",t),v._sectionTrigger=E,v._ownerSection=n,function t(n,o){if(!n||!o||n.classList.contains("is-open"))return;let i=n.querySelector(".solution-modal-category"),l=n.querySelector(".solution-modal-title"),r=n.querySelector(".solution-modal-content"),s=n.querySelector(".solution-modal-backdrop"),u=n.querySelector(".solution-modal-panel-bg"),d=n.querySelector(".solution-modal-content-mask"),$=Array.from(n.querySelectorAll("[data-modal-animate]"));a(n),i.textContent=o.title||"",l.textContent=o.popupTitle||o.caption||o.title||"",r.innerHTML=o.popupHtml||"",r.scrollTop=0;let p=Array.from(r.querySelectorAll("li"));n._timeline&&(n._timeline.kill(),n._timeline=null),n._isOpenOrOpening=!0,function e(t){if(!t||t._scrollState)return;let n=window.scrollX||window.pageXOffset||0,o=window.scrollY||window.pageYOffset||0;t._scrollState={x:n,y:o,restoring:!1,touchY:0},gsap.killTweensOf(window);let i=t._sectionTrigger;if(i&&"function"==typeof i.getTween){let l=i.getTween();l&&l.kill()}ScrollTrigger.getAll().forEach(function(e){if("function"!=typeof e.getTween)return;let t=e.getTween();t&&t.kill()}),function e(t){if(!t||t._scrollHandlers)return;let n=new Set(["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," "]);function o(e){return e&&"function"==typeof e.closest?e.closest(".solution-modal-content"):null}function i(e,t){if(!e)return!1;let n=e.scrollHeight-e.clientHeight;return!(n<=1)&&(!(t<0)||!(e.scrollTop<=0))&&(!(t>0)||!(e.scrollTop>=n-1))}function l(e){let t=o(e.target);!(t&&i(t,e.deltaY))&&e.preventDefault()}function r(e){t._scrollState&&e.touches&&e.touches.length&&(t._scrollState.touchY=e.touches[0].clientY)}function a(e){if(!t._scrollState||!e.touches||!e.touches.length){e.preventDefault();return}let n=e.touches[0].clientY,l=t._scrollState.touchY;t._scrollState.touchY=n;let r=o(e.target);!(r&&i(r,l-n))&&e.preventDefault()}function s(e){if(!n.has(e.key))return;let t=o(e.target);!t&&e.preventDefault()}function u(){t._isOpenOrOpening&&c(t)}t._scrollHandlers={onWheel:l,onTouchStart:r,onTouchMove:a,onKeyDown:s,onWindowScroll:u},window.addEventListener("wheel",l,{passive:!1,capture:!0}),window.addEventListener("touchstart",r,{passive:!0,capture:!0}),window.addEventListener("touchmove",a,{passive:!1,capture:!0}),window.addEventListener("keydown",s,{capture:!0}),window.addEventListener("scroll",u,{passive:!0})}(t),c(t)}(n),n.classList.add("is-open"),n.setAttribute("aria-hidden","false"),gsap.set(l,{visibility:"hidden"}),gsap.set(n,{display:"block"});let m=function e(t,n){if(a(t),!window.SplitType||!n||!n.textContent.trim())return[];let o=new SplitType(n,{types:"lines",lineClass:"solution-modal-title-line"});return t._titleSplit=o,o.lines.forEach(function(e){let t=document.createElement("span");t.className="solution-modal-title-line-mask",e.parentNode.insertBefore(t,e),t.appendChild(e)}),o.lines}(n,l);gsap.killTweensOf([s,u,d,...$,...m,...p]),gsap.set(s,{opacity:0}),gsap.set(u,{scaleX:.018,transformOrigin:"right center"}),gsap.set(d,{clipPath:"inset(0% 0% 0% 98.2%)"}),gsap.set($,{autoAlpha:0,x:e.modal.open.contentShift}),gsap.set(m,{yPercent:110,autoAlpha:.8}),gsap.set(p,{y:12,autoAlpha:0}),gsap.set(l,{visibility:"visible"}),function e(t,n){let o=8;function i(){t&&t._scrollState&&!(o<=0)&&(c(t),o-=1,requestAnimationFrame(i))}requestAnimationFrame(i)}(n,8),n._timeline=gsap.timeline({defaults:{overwrite:!0},onComplete:function(){n._timeline=null}}),n._timeline.to(s,{opacity:1,duration:e.modal.open.backdropDuration,ease:"power2.out"},0),n._timeline.to(u,{scaleX:1,duration:e.modal.open.backgroundDuration,ease:"power4.out"},.02),n._timeline.to(d,{clipPath:"inset(0% 0% 0% 0%)",duration:e.modal.open.maskDuration,ease:"power4.out"},.1),n._timeline.to($,{autoAlpha:1,x:0,duration:e.modal.open.contentDuration,ease:"power3.out",stagger:{each:e.modal.open.contentStagger,from:"start"}},e.modal.open.contentStart),n._timeline.to(m,{yPercent:0,autoAlpha:1,duration:.72,ease:"power4.out",stagger:{each:.08,from:"start"},overwrite:!0},e.modal.open.contentStart+.04),n._timeline.to(p,{y:0,autoAlpha:1,duration:.45,ease:"power3.out",stagger:{each:.06,from:"start"},overwrite:!0},e.modal.open.contentStart+.22)}(v,r[t])}function x(e){let t=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;return t*e}function q(){let e=t("titleGapRem");return x(e)}function C(){let t=L*(e.stepVh/100);n.style.height=L+Math.max(d-1,1)*t+"px"}function H(e,t){_&&(_.innerHTML=`${e+1} <span>/ ${d}</span>`),function e(t,n){if(!m||(b&&(b.revert(),b=null),m.textContent=r[t].caption||"",!m.textContent.trim()||!window.SplitType))return;(b=new SplitType(m,{types:"lines",lineClass:"line"})).lines.forEach(function(e){let t=document.createElement("span");t.className="solution-caption-line-inner",t.innerHTML=e.innerHTML,e.innerHTML="",e.appendChild(t)});let o=m.querySelectorAll(".solution-caption-line-inner");gsap.fromTo(o,{yPercent:-100},{yPercent:0,duration:n?0:.65,ease:"power3.out",stagger:n?0:.06,overwrite:!0})}(e,t)}function P(e,t,n){if(e===t)return 0;let o=t>e?1:-1,i=e,l=0;for(;i!==t;){let r=i+o,a=S[i].offsetHeight,s=S[r].offsetHeight,u=a/2+n+s/2;l+=u*o,i=r}return l}function D(n,o){let i=x(t("titleGapRem")),l=t("titleActiveShiftRem")+"rem";S.forEach(function(t,a){let s=a===n,u=Math.abs(a-n),c=P(n,a,i),d=s?1:gsap.utils.clamp(.12,.22,.22-.025*u);t.classList.toggle("is-active",s),s?(t.setAttribute("aria-current","true"),t.setAttribute("aria-label",`Open ${r[a].title}`)):(t.removeAttribute("aria-current"),t.setAttribute("aria-label",`Show ${r[a].title}`)),gsap.to(t,{yPercent:-50,y:c,x:s?l:"0rem",scale:1-.018*Math.min(u,3),autoAlpha:u>5?0:d,cursor:"pointer",duration:o?0:e.duration,ease:e.ease,overwrite:!0}),gsap.to(t.querySelectorAll(".solution-paren"),{opacity:s?1:0,duration:o?0:.75*e.duration,ease:e.ease,overwrite:!0})})}function M(n,o){if(!g)return;let i=x(t("titleGapRem")),l=-P(0,n,i);gsap.to(g,{y:l,duration:o?0:e.duration,ease:e.ease,overwrite:!0})}function R(t,n,o){if(y.forEach(function(e,n){let o=n===t;e.tabIndex=o?0:-1,e.setAttribute("aria-hidden",o?"false":"true"),gsap.set(e,{pointerEvents:o?"auto":"none",cursor:o?"pointer":"default"})}),o||n<0){y.forEach(function(e,n){let o=n===t;gsap.set(e,{autoAlpha:o?1:0,zIndex:o?2:0,yPercent:0,scale:1,pointerEvents:o?"auto":"none",cursor:o?"pointer":"default",clipPath:o?"inset(0% 0% 0% 0%)":"inset(100% 0% 0% 0%)"})});return}let i=t>n?1:-1,l=y[t],r=y[n];y.forEach(function(e,o){o!==t&&o!==n&&gsap.set(e,{autoAlpha:0,zIndex:0,pointerEvents:"none",clipPath:"inset(100% 0% 0% 0%)"})}),gsap.set(r,{autoAlpha:1,zIndex:1,yPercent:0,scale:1,pointerEvents:"none",cursor:"default",clipPath:"inset(0% 0% 0% 0%)"}),gsap.set(l,{autoAlpha:1,zIndex:2,yPercent:i>0?8:-8,scale:1.04,pointerEvents:"auto",cursor:"pointer",clipPath:i>0?"inset(100% 0% 0% 0%)":"inset(0% 0% 100% 0%)"}),gsap.to(l,{clipPath:"inset(0% 0% 0% 0%)",yPercent:0,scale:1,duration:e.duration,ease:e.ease,overwrite:!0}),gsap.to(r,{scale:1.02,duration:e.duration,ease:e.ease,overwrite:!0,onComplete:function(){w!==n&&gsap.set(r,{autoAlpha:0,zIndex:0,pointerEvents:"none"})}})}function W(e,t){if((e=gsap.utils.clamp(0,d-1,e))===w&&!t)return;let n=w;w=e,H(e,t),D(e,t),M(e,t),R(e,n,t)}r.forEach(function(e,t){let n=document.createElement("img");n.className="solution-stage-img",n.src=e.image,n.alt=e.alt||e.title,n.loading="eager",n.decoding="async",n.setAttribute("role","button"),n.setAttribute("tabindex","-1"),n.setAttribute("aria-label",`Open ${e.title}`),n.addEventListener("click",function(){t===w&&A(t)}),n.addEventListener("keydown",function(e){t===w&&("Enter"===e.key||" "===e.key)&&(e.preventDefault(),A(t))}),$.appendChild(n),y.push(n);let o=document.createElement("button");o.type="button",o.className="solution-title-line",o.setAttribute("aria-label",e.title),o.innerHTML=`
          <span class="solution-paren is-first">
            <img
              src="https://cdn.prod.website-files.com/69d50584fecafe4b63f705ad/6a47a90b245a74ee7c3dfae7_Subtract1.svg"
              alt=""
              aria-hidden="true"
            >
          </span>

          <span class="solution-name"></span>

          <span class="solution-paren is-second">
            <img
              src="https://cdn.prod.website-files.com/69d50584fecafe4b63f705ad/6a47a90b245a74ee7c3dfae7_Subtract1.svg"
              alt=""
              aria-hidden="true"
              style="transform: scaleX(-1);"
            >
          </span>
        `,o.querySelector(".solution-name").textContent=e.title,o.addEventListener("click",function(){if(!v._isOpenOrOpening){if(t===w){A(t);return}!function e(t){if(t=gsap.utils.clamp(0,d-1,t),v._isOpenOrOpening)return;if(k&&(k.kill(),k=null),W(t,!1),!E||d<=1||!window.ScrollToPlugin){O=!1;return}if(O=!0,"function"==typeof E.getTween){let n=E.getTween();n&&n.kill()}let o=t/(d-1),i=E.start+(E.end-E.start)*o;k=gsap.to(window,{scrollTo:{y:i,autoKill:!1},duration:.35,ease:"power2.out",overwrite:!0,onComplete:function(){k=null,O=!1,W(t,!1)},onInterrupt:function(){k=null,O=!1}})}(t)}}),p.appendChild(o),S.push(o)}),f&&!f.innerHTML.trim()&&(f.innerHTML=`
          <span>More</span>

          <span
            style="
              font-size: 22px;
              line-height: 0.8;
            "
          >
            +
          </span>
        `),f&&f.addEventListener("click",function(e){e.preventDefault(),w<0||A(w)}),C(),W(0,!0),E=ScrollTrigger.create({trigger:n,start:"top top",end:"bottom bottom",invalidateOnRefresh:!0,onUpdate:function(e){if(v._isOpenOrOpening||O)return;let t=Math.round(e.progress*(d-1));W(t,!1)},snap:!!e.useSnap&&d>1&&!o()&&{snapTo:function(e){if(v._isOpenOrOpening)return e;let t=1/(d-1);return Math.round(e/t)*t},duration:{min:.18,max:.42},delay:.04,ease:"power2.out"}});let Y=gsap.delayedCall(.15,function(){!v._isOpenOrOpening&&(C(),b&&(b.revert(),b=null),H(w,!0),D(w,!0),M(w,!0),R(w,w,!0),ScrollTrigger.refresh())}).pause();window.addEventListener("resize",function(){if(v._isOpenOrOpening)return;let e=document.documentElement.clientWidth,t=Math.abs(e-T)>1;(!o()||t)&&(T=e,L=i(),Y.restart(!0))})}function a(e){if(!e||!e._titleSplit)return;e._titleSplit.revert(),e._titleSplit=null;let t=e.querySelector(".solution-modal-title");t&&gsap.set(t,{clearProps:"visibility,opacity,transform"})}function s(e){let t=e.querySelector(".solution-modal-close");t&&"true"!==t.dataset.hoverReady&&(t.dataset.hoverReady="true",gsap.set(t,{transformOrigin:"50% 50%",rotation:0,scale:1}),t.addEventListener("mouseenter",function(){gsap.to(t,{rotation:90,scale:.8,duration:.4,ease:"power3.out",overwrite:"auto"})}),t.addEventListener("mouseleave",function(){gsap.to(t,{rotation:0,scale:1,duration:.4,ease:"power3.out",overwrite:"auto"})}),t.addEventListener("pointerdown",function(){gsap.to(t,{scale:.72,duration:.15,ease:"power2.out",overwrite:"auto"})}),t.addEventListener("pointerup",function(){gsap.to(t,{rotation:90,scale:.8,duration:.25,ease:"power3.out",overwrite:"auto"})}))}function u(t){if(!t||!t.classList.contains("is-open"))return;let n=t.querySelector(".solution-modal-title"),o=t.querySelector(".solution-modal-content"),i=t.querySelector(".solution-modal-backdrop"),l=t.querySelector(".solution-modal-panel-bg"),r=t.querySelector(".solution-modal-content-mask"),s=Array.from(t.querySelectorAll("[data-modal-animate]")),u=t._titleSplit?t._titleSplit.lines:[],d=o?Array.from(o.querySelectorAll("li")):[];t._timeline&&(t._timeline.kill(),t._timeline=null),gsap.killTweensOf([i,l,r,...s,...u,...d]),gsap.set(l,{transformOrigin:"right center"}),t._timeline=gsap.timeline({defaults:{overwrite:!0},onComplete:function(){t.classList.remove("is-open"),t.setAttribute("aria-hidden","true"),gsap.set(t,{display:"none"}),a(t),gsap.set(s,{visibility:"hidden"}),n&&gsap.set(n,{clearProps:"visibility,opacity,transform"}),c(t),function e(t){if(!t||!t._scrollState){t._isOpenOrOpening=!1;return}let n=t._scrollState.x,o=t._scrollState.y;(function e(t){if(!t||!t._scrollHandlers)return;let n=t._scrollHandlers;window.removeEventListener("wheel",n.onWheel,!0),window.removeEventListener("touchstart",n.onTouchStart,!0),window.removeEventListener("touchmove",n.onTouchMove,!0),window.removeEventListener("keydown",n.onKeyDown,!0),window.removeEventListener("scroll",n.onWindowScroll),t._scrollHandlers=null})(t),t._scrollState=null,requestAnimationFrame(function(){window.scrollTo(n,o),requestAnimationFrame(function(){window.scrollTo(n,o),t._isOpenOrOpening=!1,window.ScrollTrigger&&ScrollTrigger.update()})})}(t),t._timeline=null,t._sectionTrigger=null,t._ownerSection=null}}),t._timeline.to(s,{autoAlpha:0,x:e.modal.close.contentShift,duration:e.modal.close.contentDuration,ease:"power2.in",stagger:{each:e.modal.close.contentStagger,from:"end"}},0),t._timeline.to(u,{yPercent:35,autoAlpha:0,duration:.25,ease:"power2.in",stagger:{each:.01,from:"end"},overwrite:!0},0),t._timeline.to(d,{y:8,autoAlpha:0,duration:.2,ease:"power2.in",stagger:{each:.008,from:"end"},overwrite:!0},0),t._timeline.to(r,{clipPath:"inset(0% 0% 0% 98.2%)",duration:e.modal.close.maskDuration,ease:"power3.inOut"},.025),t._timeline.to(l,{scaleX:.018,duration:e.modal.close.backgroundDuration,ease:"power4.in"},.025),t._timeline.to(i,{opacity:0,duration:e.modal.close.backdropDuration,ease:"power2.out"},.08)}function c(e){if(!e||!e._scrollState)return;let t=e._scrollState;if(t.restoring)return;let n=window.scrollX||window.pageXOffset||0,o=window.scrollY||window.pageYOffset||0,i=Math.abs(n-t.x)>.5,l=Math.abs(o-t.y)>.5;(i||l)&&(t.restoring=!0,window.scrollTo(t.x,t.y),requestAnimationFrame(function(){e._scrollState&&(e._scrollState.restoring=!1)}))}window.Webflow=window.Webflow||[],window.Webflow.push(function(){l()})}();
