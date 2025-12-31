'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';

declare global {
  interface Window {
    createUnityInstance?: any;
  }
}

export default function RacePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadingBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLDivElement>(null);
  const warningBannerRef = useRef<HTMLDivElement>(null);
  const unityInstanceRef = useRef<any>(null);
  const isLoadingRef = useRef<boolean>(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Set up console filter immediately, before Unity loads
  useLayoutEffect(() => {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args: any[]) => {
      const message = String(args[0] || '');
      if (message.includes('FS.syncfs operations in flight') || 
          message.includes('FS.syncfs')) {
        return;
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      const message = String(args[0] || '');
      if (message.includes('FS.syncfs operations in flight') || 
          message.includes('FS.syncfs')) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || isLoadingRef.current) return;
    
    isLoadingRef.current = true;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const loadingBar = loadingBarRef.current;
    const progressBarFull = progressBarRef.current;
    const fullscreenButton = fullscreenButtonRef.current;
    const warningBanner = warningBannerRef.current;

    function unityShowBanner(msg: string, type: string) {
      if (!warningBanner) return;
      
      function updateBannerVisibility() {
        if (warningBanner) {
          warningBanner.style.display = warningBanner.children.length ? 'block' : 'none';
        }
      }
      
      const div = document.createElement('div');
      div.innerHTML = msg;
      if (warningBanner) {
        warningBanner.appendChild(div);
      }
      
      if (type === 'error') {
        div.style.cssText = 'background: red; padding: 10px;';
      } else {
        if (type === 'warning') {
          div.style.cssText = 'background: yellow; padding: 10px;';
        }
        setTimeout(() => {
          if (warningBanner && div.parentNode) {
            warningBanner.removeChild(div);
            updateBannerVisibility();
          }
        }, 5000);
      }
      updateBannerVisibility();
    }

    // Token send function - check both auth_token and token, sync if needed
    function sendTokenToUnity(unityInstance: any) {
      try {
        // Check both token locations and sync if needed
        const authToken = localStorage.getItem('auth_token');
        const token = localStorage.getItem('token');
        
        // Sync tokens if one exists but the other doesn't
        if (authToken && !token) {
          localStorage.setItem('token', authToken);
        } else if (token && !authToken) {
          localStorage.setItem('auth_token', token);
        }
        
        // Use whichever token exists
        const finalToken = authToken || token || '';
        console.log('WebGL Token:', finalToken);

        if (unityInstance && finalToken) {
          unityInstance.SendMessage(
            'PlayerLogin',
            'ReceiveToken',
            finalToken
          );
        }
      } catch (e) {
        console.error('Token error:', e);
      }
    }

    const buildUrl = '/Build';
    const loaderUrl = buildUrl + '/Build.loader.js';
    const config = {
      dataUrl: buildUrl + '/Build.data',
      frameworkUrl: buildUrl + '/Build.framework.js',
      codeUrl: buildUrl + '/Build.wasm',
      streamingAssetsUrl: 'StreamingAssets',
      companyName: 'DefaultCompany',
      productName: 'Racing',
      productVersion: '1.5.3',
      showBanner: unityShowBanner,
    };

    // Mobile detection
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes';
      document.getElementsByTagName('head')[0].appendChild(meta);
      container.className = 'unity-mobile';
      if (canvas) canvas.className = 'unity-mobile';
    } else {
      if (canvas) {
        canvas.style.width = '960px';
        canvas.style.height = '600px';
      }
    }

    if (loadingBar) loadingBar.style.display = 'block';

    // Load Unity loader script
    const script = document.createElement('script');
    script.src = loaderUrl;
    scriptRef.current = script;
    
    script.onload = () => {
      if (window.createUnityInstance) {
        window.createUnityInstance(canvas, config, (progress: number) => {
          if (progressBarFull) {
            progressBarFull.style.width = 100 * progress + '%';
          }
        }).then((unityInstance: any) => {
          unityInstanceRef.current = unityInstance;
          if (loadingBar) loadingBar.style.display = 'none';

          // Send token after Unity loads
          sendTokenToUnity(unityInstance);

          if (fullscreenButton) {
            fullscreenButton.onclick = () => {
              if (container.requestFullscreen) {
                container.requestFullscreen();
              } else if ((container as any).webkitRequestFullscreen) {
                (container as any).webkitRequestFullscreen();
              } else if ((container as any).mozRequestFullScreen) {
                (container as any).mozRequestFullScreen();
              } else if ((container as any).msRequestFullscreen) {
                (container as any).msRequestFullscreen();
              }
            };
          }
        }).catch((message: string) => {
          console.error('Unity initialization error:', message);
          if (loadingBar) loadingBar.style.display = 'none';
          isLoadingRef.current = false;
        });
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load Unity loader script');
      isLoadingRef.current = false;
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup Unity instance
      if (unityInstanceRef.current && typeof unityInstanceRef.current.Quit === 'function') {
        try {
          unityInstanceRef.current.Quit();
        } catch (e) {
          console.log('Unity cleanup:', e);
        }
        unityInstanceRef.current = null;
      }
      
      // Remove script
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      
      isLoadingRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Suppress Unity FS.syncfs warnings - runs immediately */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const originalWarn = console.warn;
              const originalError = console.error;
              
              console.warn = function(...args) {
                const message = String(args[0] || '');
                if (message.includes('FS.syncfs operations in flight') || 
                    message.includes('FS.syncfs')) {
                  return;
                }
                originalWarn.apply(console, args);
              };
              
              console.error = function(...args) {
                const message = String(args[0] || '');
                if (message.includes('FS.syncfs operations in flight') || 
                    message.includes('FS.syncfs')) {
                  return;
                }
                originalError.apply(console, args);
              };
            })();
          `,
        }}
      />
      
      {/* Unity Game Container */}
      <div 
        id="unity-container" 
        ref={containerRef}
        className="unity-desktop"
      >
        <canvas 
          id="unity-canvas" 
          ref={canvasRef}
          width={960} 
          height={600}
          tabIndex={-1}
          className="bg-[#231F20]"
        />
        
        {/* Loading Bar */}
        <div 
          id="unity-loading-bar" 
          ref={loadingBarRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden"
        >
          <div 
            id="unity-logo" 
            className="w-[154px] h-[130px] bg-[url('/TemplateData/unity-logo-dark.png')] bg-no-repeat bg-center"
          />
          <div 
            id="unity-progress-bar-empty" 
            className="w-[141px] h-[18px] mt-[10px] ml-[6.5px] bg-[url('/TemplateData/progress-bar-empty-dark.png')] bg-no-repeat bg-center"
          >
            <div 
              id="unity-progress-bar-full" 
              ref={progressBarRef}
              className="w-0 h-[18px] mt-[10px] bg-[url('/TemplateData/progress-bar-full-dark.png')] bg-no-repeat bg-center"
            />
          </div>
        </div>
        
        {/* Warning Banner */}
        <div 
          id="unity-warning" 
          ref={warningBannerRef}
          className="absolute left-1/2 top-[5%] -translate-x-1/2 bg-white p-[10px] hidden"
        />
        
        {/* Footer */}
        <div id="unity-footer" className="relative">
          <div 
            id="unity-webgl-logo" 
            className="float-left w-[204px] h-[38px] bg-[url('/TemplateData/webgl-logo.png')] bg-no-repeat bg-center"
          />
          <div 
            id="unity-fullscreen-button" 
            ref={fullscreenButtonRef}
            className="cursor-pointer float-right w-[38px] h-[38px] bg-[url('/TemplateData/fullscreen-button.png')] bg-no-repeat bg-center"
          />
          <div 
            id="unity-build-title" 
            className="float-right mr-[10px] leading-[38px] font-arial text-lg"
          >
            Racing
          </div>
        </div>
      </div>

      {/* Add Unity CSS */}
      <style jsx global>{`
        body { padding: 0; margin: 0; }
        #unity-container { position: absolute; }
        #unity-container.unity-desktop { left: 50%; top: 50%; transform: translate(-50%, -50%); }
        #unity-container.unity-mobile { position: fixed; width: 100%; height: 100%; }
        #unity-canvas { background: #231F20; }
        .unity-mobile #unity-canvas { width: 100%; height: 100%; }
        #unity-loading-bar { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: none; }
        #unity-logo { width: 154px; height: 130px; background: url('/TemplateData/unity-logo-dark.png') no-repeat center; }
        #unity-progress-bar-empty { width: 141px; height: 18px; margin-top: 10px; margin-left: 6.5px; background: url('/TemplateData/progress-bar-empty-dark.png') no-repeat center; }
        #unity-progress-bar-full { width: 0%; height: 18px; margin-top: 10px; background: url('/TemplateData/progress-bar-full-dark.png') no-repeat center; }
        #unity-footer { position: relative; }
        .unity-mobile #unity-footer { display: none; }
        #unity-webgl-logo { float: left; width: 204px; height: 38px; background: url('/TemplateData/webgl-logo.png') no-repeat center; }
        #unity-build-title { float: right; margin-right: 10px; line-height: 38px; font-family: arial; font-size: 18px; color: white; }
        #unity-fullscreen-button { cursor: pointer; float: right; width: 38px; height: 38px; background: url('/TemplateData/fullscreen-button.png') no-repeat center; }
        #unity-warning { position: absolute; left: 50%; top: 5%; transform: translate(-50%); background: white; padding: 10px; display: none; }
      `}</style>
    </div>
  );
}

