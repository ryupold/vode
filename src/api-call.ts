import { Dispatch, Effect } from "./vode.js";

export const aborted = new Error("aborted");

export const metricDefaults = () => ({
    metrics: {
        requestCount: 0,
        download: 0,
        upload: 0,
    },
});


/**
 * Make HTTP Request
 * @param {ApiCallOptions} options 
 * @param {Dispatch?} dispatch 
 * @returns {Promise<any>} promise wrapping the http request resolving in the response if status < 400, otherwise rejecting with the response
 */
export function httpRequest<S extends object | unknown>(options: {
    url: string,
    method: string,
    headers?: Record<string, string>,
    data?: any,
    timeout?: number,
    withCredentials?: boolean,
    metrics?: {
        requestCount: number,
        download: number,
        upload: number,
    },
}, dispatch?: {
    patch: Dispatch<S>,
    action?: Effect<S, any>,
    abortAction?: Effect<S, any>,
    errAction?: Effect<S, any>,
    progressAction?: Effect<S, ProgressEvent>,
    uploadProgressAction?: Effect<S, { loaded: number, total: number }>
}): Promise<any> & { abort: () => void } {
    const xhr = new XMLHttpRequest();
    const promise = new Promise((resolve, reject) => {
        if (!options.metrics) options.metrics = metricDefaults().metrics;
        if (options.metrics) options.metrics.requestCount++;

        xhr.withCredentials = options.withCredentials === undefined || options.withCredentials;
        if (options.timeout) xhr.timeout = options.timeout;

        xhr.addEventListener("timeout", (err) => {
            reject(err || new Error("timeout"));
            if (dispatch?.errAction) {
                dispatch.patch(<Effect<S>>[dispatch.errAction, err]);
            }
        });

        if (dispatch?.uploadProgressAction) {
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    if (options.metrics && event.loaded) options.metrics.upload += event.loaded;
                    dispatch.patch(<Effect<S>>[dispatch.uploadProgressAction,
                    { loaded: event.loaded, total: event.total }]);
                }
            });
        }

        if (dispatch?.progressAction) {
            xhr.addEventListener("progress", (event) => {
                console.log("progress", event);
                if (event.lengthComputable) {
                    if (options.metrics && event.loaded) options.metrics.download += event.loaded;
                    dispatch.patch(<Effect<S, ProgressEvent>>[dispatch.progressAction, event]);
                }
            });
        }

        xhr.addEventListener("loadend", (e: ProgressEvent<XMLHttpRequestEventTarget>) => {
            if (xhr.readyState === 4) {
                if (options.metrics && (e.loaded)) {
                    options.metrics.download += e.loaded;
                }
                if (xhr.status < 400) {
                    resolve(xhr.response);
                    dispatch?.action && dispatch.patch(<Effect<S>>[dispatch.action, xhr.response]);
                }
                else {
                    reject({ status: xhr.status, statusText: xhr.statusText, response: xhr.response });
                }
            }
        });



        xhr.addEventListener("abort", () => {
            reject(aborted);
            if (dispatch?.abortAction) {
                dispatch.patch(<Effect<S>>[dispatch.abortAction, aborted]);
            }
        });

        xhr.addEventListener("error", (err) => {
            reject(err);
            if (dispatch?.errAction) {
                dispatch.patch(<Effect<S>>[dispatch.errAction, err]);
            }
        });

        xhr.open(options.method, options.url, true);
        if (options.headers) {
            for (const key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }
        xhr.send(options.data);
    });
    (<any>promise).abort = () => xhr.abort();
    return <any>promise;
}
