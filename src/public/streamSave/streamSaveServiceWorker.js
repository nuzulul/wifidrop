/*
This service worker intercepts urls set by streamSave and responds with
the data streamed to it by the client. It basically acts as a middle-man
so that the client and dynamically generate data on-demand for a download.
*/

// force the worker to start listening for fetch immediately
self.oninstall = (e) => { self.skipWaiting(); }
self.onactivate = (e) => { e.waitUntil(self.clients.claim()); };

// keep a object of registered URLs
const URLs = {};

// listen for messages that register intercept URLs or set contents for responses
self.onmessage = (e) => {

    // message is a ping to keep the service worker alive
    if (e.data.ping) {
        return;
    }

    // message is to register url for fetch to intercept
    if (e.data.registerUrl) {
        URLs[e.data.registerUrl] = {
            clientId: e.source.id,
            status: undefined,
            statusText: undefined,
            headers: undefined,
            data: undefined,
        };

        // tell the client the url is registered
        e.source.postMessage({
            urlRegistered: e.data.registerUrl,
        });
    }

    // message is to set a response to a registered URL request
    if (e.data.forUrl) {
        URLs[e.data.forUrl].status = e.data.responseStatus;
        URLs[e.data.forUrl].statusText = e.data.responseStatusText;
        URLs[e.data.forUrl].headers = new Headers(e.data.responseHeaders);
        URLs[e.data.forUrl].data = e.data.responseData;
    }
};

// respond to requests by asking the client for contents via messages
async function streamingResponse(e) {

    // reset the response content
    URLs[e.request.url] = {
        clientId: URLs[e.request.url].clientId,
        status: undefined,
        statusText: undefined,
        headers: undefined,
        data: undefined,
    };

    // convert request headers to an object so it can be sent in a message
    const requestHeaders = {};
    for (const h of e.request.headers) { requestHeaders[h[0]] = h[1]; }

    // ask the client for the response content
    const client = await self.clients.get(URLs[e.request.url].clientId);
    client.postMessage({
        requestUrl: e.request.url,
        requestHeaders: requestHeaders,
    });

    // wait for the client to send a message with the response content
    await new Promise((rslv) => {
        let intId = setInterval(() => {
            if (URLs[e.request.url].status) {
                clearInterval(intId);
                rslv();
            }
        }, 10);
    });

    // build the response
    return new Response(URLs[e.request.url].data, {
        status: URLs[e.request.url].status,
        statusText: URLs[e.request.url].statusText,
        headers: URLs[e.request.url].headers,
    });
}

// intercept registered URLs with a streaming response from the client
self.onfetch = (e) => {
    if (URLs[e.request.url]) {
        e.respondWith(streamingResponse(e));
    }
};
