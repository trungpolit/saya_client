$(document).ready(function () {

    saya.initFontSize();
});
var deviceReadyDeferred = $.Deferred();
var jqmReadyDeferred = $.Deferred();
saya.onDeviceReady = function () {
    deviceReadyDeferred.resolve();
};
document.addEventListener('deviceready', saya.onDeviceReady, false);

$(document).one("mobileinit", function () {
    $.mobile.autoInitializePage = false;
    jqmReadyDeferred.resolve();

    $("#system-popup").enhanceWithin().popup();
    $("#network-popup").enhanceWithin().popup();
});

$.when(deviceReadyDeferred, jqmReadyDeferred).then(saya.initialize);
