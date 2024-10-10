// Copyright Daniel Roesler. Released under The MIT License
const thisStreamSaveScriptSrc = document.currentScript.src;

// Allows for streaming responses to urls from the client-side
async function createInterceptUrl(requestHandler, serviceWorkerUrl, baseUrl) {

    // default options
    const basePath = (new URL(thisStreamSaveScriptSrc)).pathname.split("/").slice(0, -1).join("/") + "/";
    serviceWorkerUrl = serviceWorkerUrl || basePath + "streamSaveServiceWorker.js";
    baseUrl = baseUrl || (location.origin + basePath);
	
    // register the service worker and wait for it to become active
    const swReg = await navigator.serviceWorker.register(serviceWorkerUrl, { scope: basePath });
    if (swReg.installing) {
        await new Promise((r) => { let i = setInterval(() => { if (swReg.active) { clearInterval(i); r(); }}, 10);});
    }
	
    // generate a random URL for the service worker to intercept for the download
    let urlRegistered = false;
    const url = baseUrl + crypto.randomUUID();

    // listen for messages from the service worker
    navigator.serviceWorker.onmessage = async (e) => {

        // message is confirming that the intercept URL has be set
        if (e.data.urlRegistered) {
            urlRegistered = true;
        }

        // message is asking for response headers and data
        if (e.data.requestUrl === url) {

            // determine response headers
            // expected format for resp = {
            //  status: 200,
            //  statusText: "OK",
            //  headers: {"Content-Type": "...", ...},
            //  data: <Uint8Array> or <TransformStream>.readable,
            //  writer: <TransformStream>.writable.getWriter(),  // optional, if data is TransformStream
            // }
            const resp = await requestHandler(e.data);

            // if data is coming from a TransformStream writer, need to transfer it
            const transferableObjects = [];
            if (typeof(resp.data) === "object" && resp.data.toString() === "[object ReadableStream]") {
                transferableObjects.push(resp.data);

                // also need to keep the service worker alive until writing is done
                const ping = setInterval(() => { swReg.active.postMessage({ping: true}); }, 1000);
                resp.writer.closed.then(() => { clearInterval(ping); });
            }

            // tell the service worker what the response content is
            swReg.active.postMessage({
                forUrl: url,
                responseStatus: resp.status,
                responseStatusText: resp.statusText,
                responseHeaders: resp.headers,
                responseData: resp.data,
            }, transferableObjects);
        }
    };

    // register a random url to intercept and wait for confirmation
    swReg.active.postMessage({ registerUrl: url });
    await new Promise((r) => { let i = setInterval(() => { if (urlRegistered) { clearInterval(i); r(); }}, 100);});

    return url;
}

// Allows triggering a save file dialog, then you can serve data to the download from the client-side
async function promptSave(filename, contentLength, serviceWorkerUrl, baseUrl) {

    // create a TransformStream
    const ts = new TransformStream();
    const tsReader = ts.readable;
    const tsWriter = ts.writable.getWriter();

    // handle requests by generating some headers and passing back the TransformStream
    async function saveRequestHandler(reqData) {

        // make the response a binary download with the desired filename
        const respHeaders = {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "attachment; filename=\"" + filename + "\"",
        }
        if (contentLength !== undefined) {
            respHeaders['Content-Length'] = contentLength.toString();
        }

        // return the response object in the expected format
        return {
            status: 200,
            statusText: "OK",
            headers: respHeaders,
            data: tsReader,
            writer: tsWriter,
        };
    }

    // create a url that will be intercepted by a service worker
    const interceptUrl = await createInterceptUrl(saveRequestHandler, serviceWorkerUrl, baseUrl);

    // trigger a save prompt by injecting an iframe with the intercept url
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.src = interceptUrl;
    document.body.appendChild(iframe);

    // return the generated url and the TransformStream writer
    return [interceptUrl, tsWriter];
}
