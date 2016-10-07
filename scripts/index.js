/// <reference path="libs/underscore.js" />
/// <reference path="libs/backbone.js" />
/// <reference path="libs/jquery-2.1.4.js" />
/// <reference path="libs/jquery.spin.js" />
/// <reference path="libs/localforage.backbone.js" />
/// <reference path="libs/jquery.mobile-1.4.5.js" />
/// <reference path="libs/moment.js" />
/// <reference path="libs/localforage.js" />
// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=397704
// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console.
"use strict";
var saya = {};
saya.config = {
    //serviceDomain: "http://cms.goga.mobi/",
    //serviceDomain: "http://ongas.cms/",
    serviceDomain: "http://localhost/saya_backend/",
    // serviceDomain: "http://192.168.137.1/saya_backend/",
    // serviceDomain: "http://cms.ongas.vn/",
    serviceRoot: "app/webroot/cache/",
    serviceSetting: {
        name: 'settings.json',
    },
    serviceRegion: {
        name: 'regions.json',
    },
    serviceCategory: {
        path: 'categories/',
        pattern: '{region_id}.json',
    },
    serviceProduct: {
        path: 'products/',
        pattern: '{region_id}_{category_id}.json',
    },
    serviceNotification: {
        path: 'notifications/',
        pattern: '{region_id}_{year_month}.json',
    },
    serviceOrder: {
        path: 'orders_distributors/',
        pattern: '{customer_id}/{page}.json',
    },
    serviceOrderCreate: {
        path: 'OrderServices/create',
    },
    serviceCustomerDetail: {
        path: 'customers/',
        pattern: '{customer_id}.json',
    },
    serviceFeedbackCreate: {
        path: 'FeedbackServices/create',
    },
};
// phiên bản app hiện tại
saya.client_version = 1;
// biến cờ xác định xem app có cần update hay không?
saya.is_update = 0;
// biến cờ xác định trong trường hợp app update thì đã hiện thị popup thông báo update hay chưa?
saya.open_update_popup_count = 0;
// trạng thái của network
saya.networkStatus = 1;
// Đường dẫn download app khi có update
saya.download_link = '';
// settingPromise xác định thời điểm khi nào lấy được setting thành công
saya.settingPromise = {};
saya.notificationPromise = {};
saya.openSystemPopupTimeout = null;
saya.region_parent_id = '';
saya.region_id = '';
saya.region_parent_name = '';
saya.region_name = '';
saya.category_id = '';
saya.customer_id = '';
saya.customer_info = {};
saya.product_expand = '';
saya.cart_item_remove = {};
saya.total_order = 0;
saya.total_order_distributor = 0;
saya.order_page_limit = 5;
saya.order_page = 0;
saya.order_distributor_page = 0;
saya.order_page_load = 0;
saya.is_vibrate = ''; // chế độ rung?
saya.font_size = 16; // cỡ font mặc định
saya.homepage = '#region-page';
saya.initFontSize = function () {

    localforage.getItem('font_size', function (err, value) {

        if (value) {

            saya.font_size = parseInt(value);
            $('.font-content').addClass("font-size-" + value);
        }
    });
};

// Thiết lập giá trị mặc định settings, các thiết lập này sẽ bị ghi đè khi khởi động app
saya.settings = {};
saya.settings.max_product_qty = 3;
saya.settings.popup_timeout = 3;
saya.settings.add_cart_than_max = 'Số lượng sản phẩm không thể đặt vượt quá 3 sản phẩm.';
saya.settings.not_exist_region = 'Quận/Huyện/Thị xã mà bạn đã chọn không còn tồn tại, hãy thực hiện chọn lại vùng khác.';
saya.settings.empty_cart = 'Giỏ hàng hiện tại không chứa sản phẩm nào.';
saya.settings.offline_network = 'Hãy bật dữ liệu mạng hoặc wifi.';
saya.settings.notification_on_pause_timeout = 300000;
saya.settings.notification_on_pause_message = 'Xin mời ghé thăm onGas để tham khảo sản phẩm và giá cả mới cập nhật !';
saya.settings.notification_on_exit_timeout = 300000;
saya.settings.notification_on_exit_message = 'Xin mời ghé thăm onGas để tham khảo sản phẩm và giá cả mới cập nhật !';
saya.settings.share_message = 'Ứng dụng miễn phí về sản phẩm thiết yếu cho gia đình, mời bạn tải theo đường dẫn: http://ongas.vn';
saya.settings.share_subject = 'onGas - kết nối niềm tin';
saya.settings.share_link = null;
saya.settings.share_image = null;
saya.settings.enable_vibrate = 1;
saya.settings.vibrate_time = 100;
saya.settings.order_status = ["Hủy", "Thành công", "Chờ xử lý", "Giả mạo", "Đang xử lý"];
saya.settings.order_status_unknown = 'Không xác định';
saya.settings.order_status_class = ["order-status-warning", "order-status-success", "order-status-pending", "order-status-danger", "order-status-info"];
saya.settings.order_status_class_unknown = 'order-status-unknown';
saya.settings.order_empty = 'Hiện tại, bạn chưa đặt bất cứ đơn hàng nào cả.';
saya.settings.client_version_message = 'Đã có phiên bản ứng dụng mới với nhiều tính năng mới hấp dẫn và tiện dùng hơn. Bạn hãy cập nhật ngay nhé!';
saya.settings.font_size = { min: 16, max: 20 };
saya.settings.notification_ios_version_supported = 8.0;
saya.settings.category_welcome = { "enable": 1, "text": "Mời đăng sản phẩm", color: "#3388cc", bg_hover_color: "#0047ab", "logo_path": saya.config.serviceDomain+"img/contact.png" };
saya.settings.category_welcome_content = "";

saya.caculateCartTotalPrice = function (cart) {

    var total_price = 0;
    _.each(cart, function (item, index) {

        total_price += item.qty * item.price;
    });
    return total_price;
};
saya.displayCartTotalPrice = function (total_price) {

    $('#cart-total-price').html(this.utli.numberFormat(total_price));
};
saya.setCustomerId = function () {

    localforage.getItem('customer_id', function (err, value) {

        if (!value) {

            value = device.uuid;
            if (value == 0 || value == '') {

                console.log('get customer_id from saya.utli.guid()');
                value = saya.utli.guid();
            }
            console.log('set customer_id = ' + value);
            localforage.setItem('customer_id', value);
        }

        saya.customer_id = value;
        // saya.customer_id = '9f453cc6a651d89';

        // lấy thông tin về customer
        saya.fetchCustomerDetail();
    });
};
saya.openSystemPopup = function (message, timeout) {

    if (typeof timeout === "undefined") {

        timeout = this.settings.popup_timeout;
    }

    $("#system-popup-content").html(message);
    //$("#system-popup").popup();
    $("#system-popup").popup("open", {
        positionTo: "window",
        transition: "pop",
    });

    // thực hiện gán tham chiếu timeout, để điều khiển bật tắt
    this.openSystemPopupTimeout = setTimeout(function () {

        $("#system-popup").popup('close');
    }, timeout * 1000);
};
saya.openNetworkPopup = function (message) {

    console.log('NetworkPopup is opening ...');
    $("#network-popup-content").html(message);
    //$("#network-popup").popup();
    $("#network-popup").popup("open", {
        positionTo: "window",
        transition: "pop",
    });
};
saya.openCheckoutSuccessPopup = function (message, timeout) {

    if (typeof timeout === "undefined") {

        timeout = this.settings.popup_timeout;
    }

    $("#checkout-success-content").html(message);
    $("#checkout-success").popup();
    $("#checkout-success").popup("open", {
        positionTo: "window",
        transition: "pop",
    });
    setTimeout(function () {

        $("#checkout-success").popup('close');
    }, timeout * 1000);
};
saya.openFeedbackSuccessPopup = function (message, timeout) {

    if (typeof timeout === "undefined") {

        timeout = this.settings.popup_timeout;
    }

    $("#feedback-success-content").html(message);
    $("#feedback-success").popup();
    $("#feedback-success").popup("open", {
        positionTo: "window",
        transition: "pop",
    });
    setTimeout(function () {

        $("#feedback-success").popup('close');
    }, timeout * 1000);
};
saya.openUpdatePopup = function () {

    $('#update-popup-content').html(saya.settings.client_version_message);
    $("#update-popup").popup();
    $("#update-popup").popup("open", {
        positionTo: "window",
        transition: "pop",
    });
};
saya.checkRegionSubmit = function (regions) {

    console.log('checkRegionSubmit ...');
    // kiểm tra tính hợp lệ của region nếu khách hàng đã chọn region từ trước
    if (saya.region_id.length) {

        if (
            !regions.parent.hasOwnProperty(saya.region_parent_id) ||
            !regions.child.hasOwnProperty(saya.region_parent_id) ||
            !regions.child[saya.region_parent_id].hasOwnProperty(saya.region_id)
            ) {

            console.log('regions are invalid, change to #region-page');
            saya.openSystemPopup(saya.settings.not_exist_region);
            setTimeout(function () {

                $(":mobile-pagecontainer").pagecontainer("change", $('#region-page'), { transition: "slide" });
                return;
            }, (saya.settings.popup_timeout + 0.5) * 1000);

            return false;
        }

        return true;
    }

    return false;
};
saya.updateRegionSubmit = function (parent_name, child_name) {

    // nếu chưa tồn tại thông tin về region_submit thì không cần thực hiện update
    if (!saya.region_id.length) {

        return;
    }

    console.log('Update parent_name and child_name into localforage.region_submit');
    saya.region_parent_name = parent_name;
    saya.region_name = child_name;
    var region_submit = {
        parent: saya.region_parent_id,
        child: saya.region_id,
        parent_name: saya.region_parent_name,
        child_name: saya.region_name,
    };
    console.log('region_submit:');
    console.log(region_submit);
    localforage.setItem('region_submit', region_submit);
};
saya.initializePage = function () {
    // thực hiện điều hướng sang #category-page nếu đã được thiết lập region_submit
    console.log('Check whether navigate to #region-page or #category-page');
    localforage.getItem('region_submit', function (err, value) {

        if (_.isObject(value) && value.parent.length && value.child.length) {

            console.log('navigate to #category-page');
            window.location.hash = '#category-page';
            saya.homepage = '#category-page';

            console.log('get data from localforage.region_submit:');
            console.log(value);

            // thiết lập giá trị liên quan tới region vào biến toàn cục
            saya.region_parent_id = value.parent;
            saya.region_id = value.child;
            saya.region_parent_name = value.parent_name;
            saya.region_name = value.child_name;

            console.log('When saya.fetchSetting() was done, check whether localforage.region_submit is valid or not?');
            saya.settingPromise.done(function (setting) {

                // kiểm tra tính hợp lệ của region nếu khách hàng đã chọn region từ trước
                var regions = setting.regions;
                console.log('Check whether localforage.region_submit is exist');
                var check_region_submit = saya.checkRegionSubmit(regions);

                // thực hiện update tên name của region nhận từ server
                if (check_region_submit) {

                    console.log('localforage.region_submit is exist');
                    var region_parent_name = regions.parent[saya.region_parent_id];
                    var region_name = regions.child[saya.region_parent_id][saya.region_id];
                    console.log('update region_parent_name & region_name returned from server to localforage.region_submit');
                    saya.updateRegionSubmit(region_parent_name, region_name);
                }
            });

        } else {

            console.log('navigate to #region-page');
            window.location.hash = '#region-page';
            saya.homepage = '#region-page';
        }

        $.mobile.initializePage();
    });
};
saya.fetchSetting = function () {

    $('body').spin();
    var deferred = $.Deferred();
    var setting = new saya.Setting();
    var fetchSetting = setting.fetch();
    fetchSetting.done(function (data, textStatus, jqXHR) {

        console.log('fetchSetting was done, settings from sever:');
        console.log(data);
        localforage.setItem('settings', data, function (err, value) {

            if (!value) {

                deferred.reject(err);
                return;
            }

            deferred.resolve(value)
            return;
        });

        // ghi đè cấu hình settings nhận từ server xuống client
        _.each(data, function (value, key) {

            console.log('override saya.settings.' + key + ' from server');
            // Thực hiện kiểm tra key có phải là path không để điền vào domain
            if (key.search('_path') !== -1 && _.isString(value)) {
                saya.settings[key] = saya.config.serviceDomain + value;
            } else if (_.isObject(value) && !_.isArray(value)) {
                saya.settings[key] = _.mapObject(value, function (v, k) {
                    
                    if (k.search('_path') !== -1 && _.isString(v)) {
                        return saya.config.serviceDomain + v;
                    } else {
                        return v;
                    }
                });
            } else {
                saya.settings[key] = value;
            }
            console.log('saya.settings.' + key + ' was overridden to:');
            console.log(saya.settings[key]);
        });

        // thực hiện kiểm tra xem app có phiên bản mới hay không?
        if (!_.isEmpty(data.client_versions)) {

            var client_versions = data.client_versions;
            _.each(client_versions, function (value, key) {

                var platform_os = value.platform_os.toLowerCase();
                var platform_version = value.platform_version;
                if (platform_os == device.platform.toLowerCase()) {

                    console.log('Compare device.platform with the platform_os setting: ' + platform_os);
                    if (saya.client_version < platform_version) {

                        console.log('Have a new platform_version: ' + platform_os + ' greater than saya.client_version' + saya.client_version);
                        saya.is_update = 1;
                        saya.download_link = value.download_link;
                    }

                    return;
                }

            });
        }

        // thực hiện kiểm tra xem có thiết lập ads hay không?
        if (!_.isEmpty(data.ads)) {

            var ads = data.ads[0];
            var ads_description = ads.description;
            $('#ads-description').find('span').html(ads_description);
            $('#ads-description').removeClass('ads-hidden');
            //$('#ads-description').toolbar("refresh");
        }

        $('body').spin(false);
    });

    fetchSetting.fail(function (jqXHR, textStatus, errorThrown) {

        console.log('fetchSetting was failed');
        deferred.reject(errorThrown);
        $('body').spin(false);
    });

    return deferred.promise();
};
saya.fetchNotification = function () {

    var deferred = $.Deferred();
    var notificationCollection = new saya.NotificationCollection();
    var fetchNotification = notificationCollection.fetch();
    fetchNotification.done(function (data, textStatus, jqXHR) {

        localforage.setItem('notifications', data, function (err, value) {

            if (!value) {

                deferred.reject(err);
                return;
            }

            deferred.resolve(value)
            return;
        });
    });

    fetchNotification.fail(function (jqXHR, textStatus, errorThrown) {

        console.log('fetchNotification was failed');
        deferred.reject(errorThrown);
    });

    return deferred.promise();
};
saya.fetchCustomerDetail = function () {

    if (!saya.customer_id.length) {

        return;
    }

    var url = saya.config.serviceDomain + saya.config.serviceRoot + saya.config.serviceCustomerDetail.path + saya.config.serviceCustomerDetail.pattern.replace('{customer_id}', saya.customer_id);

    var fetch = $.get(url, {}, function (data) {

        console.log('fetchCustomerDetail was successful, customer details:');
        console.log(data);
        saya.saveCustomerOrder(data);
    }, 'json');

    fetch.fail(function (jqXHR, textStatus, errorThrown) {

        console.log('fetchCustomerDetail was failed');
    });
};
saya.saveCustomerOrder = function (data) {

    saya.total_order = data.total_order;
    saya.total_order_distributor = data.total_order_distributor;

    // tính toán page dựa vào total và limit
    saya.order_page = Math.ceil(saya.total_order / saya.order_page_limit);
    saya.order_distributor_page = Math.ceil(saya.total_order_distributor / saya.order_page_limit);

    // thực hiện ghi lại thông tin
    localforage.setItem('total_order', data.total_order);
    localforage.setItem('total_order_distributor', data.total_order_distributor);
    localforage.setItem('order_page', saya.order_page);
    localforage.setItem('order_distributor_page', saya.order_distributor_page);
};
saya.exitApp = function () {

    console.log('Empty cart before exit app!');
    saya.emptyCart();

    saya.setNotificationSchedule();

    console.log('Exit app');
    if (navigator.app) {
        navigator.app.exitApp();
    }
    else if (navigator.device) {
        navigator.device.exitApp();
    }

    window.close();
};
saya.emptyCart = function () {

    // thực hiện xóa dữ liệu carts nguyên gốc
    localforage.removeItem('carts');
    // lấy ra các sản phẩm chứa trong giỏ hàng
    saya.cart.fetch({
        success: function (collection, response, options) {

            // nếu giỏ hàng không rỗng, thì thực hiện xóa từng sản phẩm trong giỏ hàng
            var cart = saya.cart.toJSON();
            if (cart.length) {

                console.log('empty cart');
                _.each(cart, function (value, index) {

                    var item_id = value.id;
                    collection.get(item_id).destroy();
                });
            }
        },
    });
};
saya.changeHomePage = function () {

    var $active_page = $(":mobile-pagecontainer").pagecontainer("getActivePage");
    var active_page_selector = $active_page.attr('id');
    console.log('active page is #' + active_page_selector);

    console.log('fetchSetting is re-fetching...');
    saya.settingPromise = saya.fetchSetting();

    console.log('setCustomerId is re-setting...');
    saya.setCustomerId();

    if (saya.region_id.length) {

        if (active_page_selector !== 'category-page') {

            console.log('#category-page is changing ...');
            $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
        } else {

            console.log('#category-page is reloading ...');
            $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide", allowSamePageTransition: true, changeHash: false });
        }
    } else {

        if (active_page_selector !== 'region-page') {

            console.log('#region-page is changing ...');
            $(":mobile-pagecontainer").pagecontainer("change", $('#region-page'), { transition: "slide" });
        } else {

            console.log('#region-page is reloading');
            $(":mobile-pagecontainer").pagecontainer("change", $('#region-page'), { transition: "slide", allowSamePageTransition: true, changeHash: false });
        }
    }
};
saya.isOnline = function () {

    var networkState = navigator.connection.type;

    if (networkState == Connection.NONE || networkState == Connection.CELL_2G) {

        return 0;
    }

    return 1;
};
saya.popupNetworkOffline = function () {

    var is_online = saya.isOnline();
    if (!is_online) {

        if (saya.networkStatus !== 0) {

            console.log('Network is offline');
            console.log('Change saya.networkStatus = 0 & open NetworkPopup');
            saya.networkStatus = 0;
            saya.openNetworkPopup(saya.settings.offline_network);
        }
    }
};
saya.setCustomerName = function () {

    if (_.isObject(saya.customer_info)) {

        var customer_fullname = saya.customer_info.fullname;
        $('.customer-welcome').text(customer_fullname);
    }
};
saya.emptyNotification = function () {

    $('.marquee').html('');
    $('.marquee').marquee('destroy');
};
saya.setNotificationSchedule = function () {

    // kiểm tra nếu platform là iOS, và có version nhỏ hơn 8.0 thì không thực hiện set notification vì không hỗ trợ
    if (device.platform == 'iOS' && parseFloat(device.version) < saya.settings.notification_ios_version_supported) {

        return;
    }
    var now = new Date().getTime(),
    timeout = new Date(now + saya.settings.notification_on_pause_timeout * 1000);
    var sound = device.platform == 'Android' ? 'file://sound.mp3' : 'file://beep.caf';
    var options = {
        id: 1,
        text: saya.settings.notification_on_pause_message,
        at: timeout,
        badge: 1,
        sound: sound,
    };

    if (device.platform == 'Android') {

        options.led = "FF0000";
    }

    cordova.plugins.notification.local.schedule(options);
};
saya.initializeForiOs = function(){

    // xử lý dành riêng cho iOS
    if (device.platform == 'iOS') {

        $('.exit-app').hide();
        console.log('Empty cart before exit app!');
        saya.emptyCart();

        saya.setNotificationSchedule();
    }
};

saya.Setting = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
    url: function () {

        var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceSetting.name;
        console.log('Setting: fetch remote data from "' + url + '"');
        return url;
    },
});

saya.Category = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
    url: function () {

        return this.config.serviceDomain + this.config.serviceRoot + this.config.serviceCategory.name;
    },
});

saya.Product = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
    url: function () {

        return this.config.serviceDomain + this.config.serviceRoot + this.config.serviceProduct.name;
    },
});

saya.Order = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
});

saya.Notification = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
});

saya.Cart = Backbone.Model.extend({
    initialize: function () {
        this.config = saya.config;
    },
    sync: Backbone.localforage.sync('cart'),
});

saya.CategoryCollection = Backbone.Collection.extend({
    initialize: function () {
        this.config = saya.config;
    },
    model: saya.Category,
    url: function () {

        this.config.serviceCategory.name = this.config.serviceCategory.pattern.replace('{region_id}', saya.region_id);
        var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceCategory.path + this.config.serviceCategory.name;
        console.log('CategoryCollection: fetch remote data from "' + url + '"');
        return url;
    },
});

saya.ProductCollection = Backbone.Collection.extend({
    initialize: function () {
        this.config = saya.config;
    },
    model: saya.Product,
    url: function () {

        this.config.serviceProduct.name = this.config.serviceProduct.pattern.replace('{region_id}', saya.region_id).replace('{category_id}', saya.category_id);
        var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceProduct.path + this.config.serviceProduct.name;
        console.log('ProductCollection: fetch remote data from "' + url + '"');
        return url;
    },
});

saya.NotificationCollection = Backbone.Collection.extend({
    initialize: function () {
        this.config = saya.config;
    },
    model: saya.Notification,
    url: function () {

        var year_month = saya.utli.getYearMonth()
        this.config.serviceNotification.name = this.config.serviceNotification.pattern.replace('{region_id}', saya.region_id).replace('{year_month}', year_month);
        var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceNotification.path + this.config.serviceNotification.name;
        console.log('NotificationCollection: fetch remote data from "' + url + '"');
        return url;
    },
});

saya.CartCollection = Backbone.Collection.extend({
    initialize: function () {
        this.config = saya.config;
    },
    model: saya.Cart,
    sync: Backbone.localforage.sync('carts'),
});

saya.OrderCollection = Backbone.Collection.extend({
    initialize: function (models, options) {
        this.config = saya.config;
        if (!_.isUndefined(options) && !_.isUndefined(options.page)) {

            this.page = options.page;
        } else {

            this.page = saya.order_distributor_page;
        }
    },
    model: saya.Order,
    url: function () {

        this.config.serviceOrder.name = this.config.serviceOrder.pattern.replace('{customer_id}', saya.customer_id).replace('{page}', this.page);
        var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceOrder.path + this.config.serviceOrder.name;
        console.log('OrderCollection: fetch remote data from "' + url + '"');
        return url;
    },
});

saya.CategoryListView = Backbone.View.extend({
    el: '<ul data-role="listview" data-inset="true" />',
    render: function () {
        var models = this.collection.models;
        var self = this;
        _.each(models, function (model, index) {

            var categoryItem = new saya.CategoryItemView({ model: model, index: index });
            self.$el.append(categoryItem.el);
        });

       if (saya.settings.category_welcome.enable) {
            console.log('Append Category Welcome');
            var categoryWelcomeItem = new saya.CategoryWelcomeItemView();
            self.$el.append(categoryWelcomeItem.el);
        }

        return this;
    },
});

saya.CategoryWelcomeListView = Backbone.View.extend({
    el: '<ul data-role="listview" data-inset="true" />',
    render: function () {
        var self = this;
        if (saya.settings.category_welcome.enable) {
            console.log('Append Category Welcome');
            var categoryWelcomeItem = new saya.CategoryWelcomeItemView();
            self.$el.append(categoryWelcomeItem.el);
        }

        return this;
    },
});

saya.ProductListView = Backbone.View.extend({
    el: '<ul data-role="listview" data-inset="true" />',
    render: function () {
        var models = this.collection.models;
        var self = this;
        _.each(models, function (model, index) {

            var productItem = new saya.ProductItemView({ model: model, index: index });
            // thực hiện hiện thị chi tiết 1 product, nếu là sự kiện click vào product trong giỏ hàng
            self.$el.append(productItem.el);
        });

        return this;
    },
    expand: function () { // thực hiện hiện thị thông tin chi tiết của 1 product, khi click vào product trong giỏ hàng cart

        if (!saya.product_expand.length) {

            return;
        }

        console.log('Product with id=' + saya.product_expand + ' need to expand');
        var $product_expand = $(saya.product_expand);
        console.log($product_expand);
        saya.product_expand = '';

        // thực hiện scroll tới vị trí product đã được expand
        var offset = $product_expand.offset();
        console.log('Product needed to expand has offset:');
        console.log(offset);

        console.log('Scroll to expanded product with offset.top: ' + offset.top);
        $(':mobile-pagecontainer').animate({
            scrollTop: offset.top
        }, 2000);

        // $.mobile.silentScroll(offset.top);

        $product_expand.find('a.product-item').trigger('click');
    },
});

saya.CartListView = Backbone.View.extend({
    el: '<ul data-role="listview" data-inset="true" />',
    render: function () {
        var models = this.collection.models;
        var self = this;
        _.each(models, function (model, index) {

            var cartItem = new saya.CartItemView({ model: model });
            self.$el.append(cartItem.el);
        });

        return this;
    },
});

saya.CheckoutListView = Backbone.View.extend({
    el: $('#checkout-list'),
    render: function () {
        var models = this.collection.models;
        var self = this;
        self.$el.html('');
        _.each(models, function (model, index) {

            var cartItem = new saya.CheckoutItemView({ model: model });
            self.$el.append(cartItem.el);
        });

        return this;
    },
});

saya.OrderListView = Backbone.View.extend({
    initialize: function (options) {
        this.options = options;
        _.bindAll(this, 'render');
    },
    el: $('#order-list'),
    render: function () {
        var models = this.collection.models;
        var self = this;

        // nếu không định nghĩa tham số append thì thực hiện ghi đè
        if (_.isUndefined(this.options.append)) {

            self.$el.html('');
        }

        _.each(models, function (model, index) {

            var orderItem = new saya.OrderItemView({ model: model, index: index });
            self.$el.append(orderItem.el);
        });

        return this;
    },
});

saya.CheckoutCustomerView = Backbone.View.extend({
    el: $('#checkout-customer'),
    template: _.template($('#checkout-customer-tpl').html()),
    render: function () {

        this.$el.html('');
        this.$el.append(this.template(this.model));

        return this;
    },
});

saya.CategoryItemView = Backbone.View.extend({
    tagName: 'li',
    template: _.template('<a href="#product-page" data-category_id="<%= id %>" data-transition="slide"><img src="<%= logo_path %>" class="ui-li-thumb"><h2><%= name %></h2></a>'),
    initialize: function (options) {
        this.options = options;
        _.bindAll(this, 'render');
        this.render();
    },
    render: function () {
        //Pass variables in using Underscore.js Template
        var logo_uri = _.isArray(this.model.get('logo_uri')) ? this.model.get('logo_uri')[0] : '';
        var variables = { id: this.model.get('id'), name: this.model.get('name'), logo_path: saya.config.serviceDomain + logo_uri };
        var template = this.template(variables);

        // Load the compiled HTML into the Backbone "el"
        this.$el.html(template);
        return this;
    },
    events: {
        "click": "onClick",
    },
    onClick: function (event) {
        var category_id = this.$('a').data('category_id');
        saya.category_id = category_id;
    },
});

saya.CategoryWelcomeItemView = Backbone.View.extend({
    tagName: 'li',
    template: _.template('<a href="#welcome-page" data-transition="slide"><img src="<%= logo_path %>" class="ui-li-thumb"><h2 style="color:<%= color %>"><%= text %></h2></a>'),
    initialize: function (options) {
        this.options = options;
        _.bindAll(this, 'render');
        this.render();
    },
    render: function () {
        var variables = saya.settings.category_welcome;
        var template = this.template(variables);

        this.$el.html(template);
        return this;
    },
});

saya.ProductItemView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#product-item-tpl').html()),
    initialize: function (options) {
        this.options = options;
        _.bindAll(this, 'render', 'onCartCreateSuccess', 'onCartCreateError', 'changeCartPage');
        this.render();
    },
    render: function () {

        console.log('Render product item');
        var variables = this.model.toJSON();

        // thiết lập id cho li
        this.$el.attr('id', 'product-' + variables.id);

        var logo_uri = _.isArray(this.model.get('logo_uri')) ? this.model.get('logo_uri')[0] : '';
        variables.logo_path = saya.config.serviceDomain + logo_uri;

        // thực hiện điền domain vào thumb_uri
        var thumb_uri = _.isArray(this.model.get('thumb_uri')) ? this.model.get('thumb_uri') : '';
        if (!_.isEmpty(thumb_uri)) {
            thumb_uri = _.map(thumb_uri, function (value) {
                return saya.config.serviceDomain + value;
            });
            variables.thumb_path = _.escape(JSON.stringify(thumb_uri));
        } else {
            variables.thumb_path = '';
        }

        variables.serialize = _.escape(JSON.stringify(variables));
        variables.price = saya.utli.numberFormat(parseFloat(variables.price));

        console.log('Product item detail:');
        console.log(variables);

        var template = this.template(variables);
        this.$el.html(template);

        return this;
    },
    events: {
        "click .cart": "onCartButtonClick",
        "click a.product-item": "onProductItemClick",
        "click img.product-logo": "onProductLogoClick",
    },
    onProductItemClick: function (event) {

        console.log('Tap on product item was trigger');
        var $self = this.$('a.product-item');
        var $description = $self.find('.description');
        if ($self.hasClass('ui-icon-carat-d')) {

            $self.removeClass('ui-icon-carat-d');
            $self.addClass('ui-icon-carat-u');
            $description.show();
        } else {

            $self.removeClass('ui-icon-carat-u');
            $self.addClass('ui-icon-carat-d');
            $description.hide();
        }
    },
    onCartButtonClick: function (event) {

        console.log('Tap on cart button was trigger');
        var $self = $(event.currentTarget);
        var item = $self.data('item');
        var thisView = this;
        console.log('Prepare add item into the cart');
        console.log(item);

        saya.cart.fetch({
            success: function (collection, response, options) {

                console.log('Carts was get successful.');
                // trường hợp giỏ hàng rỗng, thực hiện tạo ra item đầu tiên
                if (!response) {
                    console.log('Carts was empty, create first item');
                    item.qty = 1;
                    collection.create(item, {
                        success: thisView.onCartCreateSuccess,
                        error: thisView.onCartCreateError,
                    });
                    return;
                }

                // trường hợp giỏ hàng đã tồn tại item
                var model = collection.get(item.id);
                // trường hợp giỏ hàng chưa tồn tại item có id hiện tại, thực hiện tạo mới item này trong giỏ hàng
                if (!model) {

                    console.log('Carts dont have any item with id=' + item.id + ', create a new item');
                    item.qty = 1;
                    collection.create(item, {
                        success: thisView.onCartCreateSuccess,
                        error: thisView.onCartCreateError,
                    });
                    return;
                }
                // trường hợp giỏ hàng đã tồn tại item với id hiện tại, thì thực hiện  thêm +1 vao qty của item trong giỏ hàng
                var new_qty = parseInt(model.get('qty')) + 1;
                // thực hiện kiểm tra nếu số lượng qty vượt quá số lượng qty cho phép thì thực hiện popup cảnh báo
                if (new_qty > saya.settings.max_product_qty) {

                    //saya.openSystemPopup(saya.settings.add_cart_than_max);
                    //return false;

                    new_qty = parseInt(saya.settings.max_product_qty);
                }
                // thực hiện +1 vào qty
                console.log('Carts had the item with id=' + item.id + ', increase item qty to ' + new_qty);
                model.save({ qty: new_qty }, {
                    success: thisView.onCartCreateSuccess,
                    error: thisView.onCartCreateError,
                });
            },
        });
    },
    onProductLogoClick: function (event) {

        console.log('Tap on product logo image was trigger');
        var $self = $(event.currentTarget);
        var thumb_path = $self.data('thumb_path');
        console.log('list thumb_path of product:');
        console.log(thumb_path);

        if (!_.isEmpty(thumb_path)) {

            var pswpElement = document.querySelectorAll('.pswp')[0];
            console.log('Build thumb gallery');
            // build items array
            var items = _.map(thumb_path, function (path) {
                return {
                    src: path,
                    w: 0,
                    h:0,
                };
            });

            // define options (if needed)
            var options = {
                // history & focus options are disabled on CodePen        
                history: false,
                focus: false,

                showAnimationDuration: 0,
                hideAnimationDuration: 0

            };

            var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
            gallery.listen('gettingData', function (index, item) {
                if (item.w < 1 || item.h < 1) { // unknown size
                    var img = new Image();
                    img.onload = function () { // will get size after load
                        item.w = this.width; // set image width
                        item.h = this.height; // set image height
                        gallery.invalidateCurrItems(); // reinit Items
                        gallery.updateSize(true); // reinit Items
                    }
                    img.src = item.src; // let's download image
                }
            });
            gallery.init();
        }

        return false;
    },
    changeCartPage: function () {

        console.log('#cart-page was rendered, change to #cart-page');
        $(":mobile-pagecontainer").pagecontainer("change", "#cart-page", { transition: "slide" });
    },
    onCartCreateSuccess: function () {

        console.log('Carts was updated, re-render #cart-page');
        var total_price = saya.caculateCartTotalPrice(saya.cart.toJSON());
        saya.displayCartTotalPrice(total_price);
        this.changeCartPage();
    },
    onCartCreateError: function () {

        console.log('Carts was not updated.');
    },
});

saya.CartItemView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#cart-item-tpl').html()),
    initialize: function () {
        this.render();
    },
    render: function () {

        console.log('Render cart item');
        var variables = this.model.toJSON();

        // thiết lập id cho li
        this.$el.attr('id', 'cart-item-' + variables.id);

        var logo_uri = _.isArray(this.model.get('logo_uri')) ? this.model.get('logo_uri')[0] : '';
        variables.logo_path = saya.config.serviceDomain + logo_uri;

        variables.serialize = _.escape(JSON.stringify(variables));
        variables.price = saya.utli.numberFormat(parseFloat(variables.price));
        variables.max_qty = saya.settings.max_product_qty;

        console.log('Cart item detail:');
        console.log(variables);

        var template = this.template(variables);
        this.$el.html(template);

        return this;
    },
    events: {
        "change .qty": "onChange",
        "click .cart-item": "onClick",
    },
    onChange: function (event) {

        console.log('Change product item qty was trigger');
        var $self = $(event.currentTarget);
        var item = $self.data('item');
        var product = saya.cart.get(item.id);
        if (!product) {

            console.log('Product item with id=' + item.id + ' doesnt exist in cart');
            return;
        }

        var new_qty = $self.val();
        var old_qty = product.get('qty');

        if (new_qty <= 0) {

            saya.cart_item_remove = item;
            $("#cart-confirm-remove").popup("open", {});
            return;
        }

        if (new_qty > saya.settings.max_product_qty) {

            saya.openSystemPopup(saya.settings.add_cart_than_max);
            return;
        }

        product.save({ qty: new_qty }, {
            success: this.onChangeSuccess,
            error: this.onChangeError,
        });
    },
    onChangeSuccess: function () {

        var total_price = saya.caculateCartTotalPrice(saya.cart.toJSON());
        saya.displayCartTotalPrice(total_price);
    },
    onChangeError: function () {

    },
    onClick: function (event) {

        console.log('.cart-item click event was trigger')
        var $self = $(event.currentTarget);
        saya.product_expand = $self.data('expand');
        var category_id = $self.data('category_id');

        // thực hiện  set lại state của saya.category_id để khi quay về trang product-page hiện thị đúng
        console.log('Reset saya.category_id = ' + category_id);
        saya.category_id = category_id;
    },
});

saya.CheckoutItemView = Backbone.View.extend({
    tagName: 'div',
    template: _.template($('#checkout-item-tpl').html()),
    initialize: function () {
        this.render();
    },
    render: function () {

        console.log('Render checkout item');
        var variables = this.model.toJSON();

        var logo_uri = _.isArray(this.model.get('logo_uri')) ? this.model.get('logo_uri')[0] : '';
        variables.logo_path = saya.config.serviceDomain + logo_uri;

        variables.serialize = _.escape(JSON.stringify(variables));
        variables.price = saya.utli.numberFormat(parseFloat(variables.price));

        console.log('Checkout item detail:');
        console.log(variables);

        var template = this.template(variables);

        this.$el.html(template);
        return this;
    },
});

saya.OrderItemView = Backbone.View.extend({
    tagName: 'div',
    template: _.template($('#order-item-tpl').html()),
    initialize: function () {
        this.render();
    },
    render: function () {

        console.log('Render order item');
        var variables = this.model.toJSON();
        var items = variables.items;
        variables.product_items = [];

        // thực hiện lấy ra label của status
        variables.status_label = saya.settings.order_status[variables.status];

        // lấy ra class css của status tương ứng
        variables.status_class = saya.settings.order_status_class[variables.status];

        // format lại chuỗi created
        variables.created_label = saya.utli.formatDateTime(variables.created);

        variables.total_price = saya.utli.numberFormat(parseFloat(variables.total_price));

        // thực hiện parse lại cấu trúc items
        _.each(items, function (val, key) {

            var logo_path = saya.config.serviceDomain + val.product_logo_uri;
            var price = saya.utli.numberFormat(parseFloat(val.product_price));
            variables.product_items.push({
                product_id: val.product_id,
                product_name: val.product_name,
                product_logo_path: logo_path,
                product_qty: val.qty,
                product_price: price,
                product_unit: val.product_unit,
            });
        });

        console.log('Order item detail:');
        console.log(variables);

        var template = this.template(variables);

        this.$el.html(template);
        return this;
    },
});

saya.helper = {};
saya.helper.renderOpts = function (pair) {

    var output = '';
    _.each(pair, function (val, key) {

        output += '<option value="' + key + '">' + val + '</option>';
    });

    return output;
};
saya.utli = {};
saya.utli.numberFormat = function (number, dec, dsep, tsep) {

    if (isNaN(number) || number == null) return '';

    number = number.toFixed(~~dec);
    tsep = typeof tsep == 'string' ? tsep : ',';

    var parts = number.split('.'),
      fnums = parts[0],
      decimals = parts[1] ? (dsep || '.') + parts[1] : '';

    return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
};
saya.utli.guid = function () {

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return uuid;
};
saya.utli.getYearMonth = function () {

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!

    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    var year_month = yyyy.toString() + mm.toString();
    return year_month;
};
saya.utli.formatDateTime = function (str) {

    var datestring = moment(str, "YYYY-MM-DD HH:mm:ss").format("DD/MM/YYYY HH:mm");

    return datestring;
};

// khởi tạo luôn cartCollection toàn cục, dùng chung cho cả ứng dụng
saya.cart = new saya.CartCollection();

saya.initialize = function () {

    // ẩn menu điều khoản đối với platform không phải Windows hay Windowsphone
    if (device.platform != 'WinCE' && device.platform != 'Win32NT') {

        $('.privacy').hide();
    }

    $.ajaxSetup({ cache: false });
    saya.settingPromise = saya.fetchSetting();
    saya.initializePage();
    saya.setCustomerId();

    FastClick.attach(document.body);
    var key = 'abcxyz';
    var sound = device.platform == 'Android' ? 'file://beep.caf' : 'file://beep.caf';

    // thiết lập dành riêng cho iOS
    saya.initializeForiOs();

    //$("#system-popup").enhanceWithin().popup();
    //$("#network-popup").enhanceWithin().popup();

    // lấy ra trạng thái bật/tắt rung
    localforage.getItem('is_vibrate', function (error, value) {

        console.log('Get info from is_vibrate');
        console.log(value);
        if (!_.isNull(value)) {

            saya.is_vibrate = parseInt(value);
            console.log('is_vibrate was setted, its value is ' + saya.is_vibrate);
            if (saya.is_vibrate) {

                $('#enable-vibrate').prop('checked', true);
            } else {

                $('#enable-vibrate').prop('checked', false);
            }
        } else {

            console.log('is_vibrate was not setted, its value is null');
            saya.is_vibrate = '';
        }
    });

    // điều khiển bấm nút thì rung
    $('body').on('click', '.ui-btn', function () {

        if (_.isNull(saya.is_vibrate)) {

            saya.is_vibrate = parseInt(saya.settings.enable_vibrate);
        }

        // nếu có bật chế độ rung
        if (saya.is_vibrate) {

            $('#enable-vibrate').prop('checked', true);
            var vibrate_time = parseInt(saya.settings.vibrate_time);
            navigator.vibrate(vibrate_time);
        } else {

            $('#enable-vibrate').prop('checked', false);
        }
    });

    // thay đổi bật/tắt chế độ rung
    $('#enable-vibrate').on('change', function () {

        console.log('#enable-vibrate was trigger change');
        if ($(this).prop('checked')) {

            saya.is_vibrate = 1;
        } else {

            saya.is_vibrate = 0;
        }

        console.log('set is_vibrate = ' + saya.is_vibrate);
        localforage.setItem('is_vibrate', saya.is_vibrate);
    });

    // thay đổi cỡ chữ
    $(document).on('change', '#font-range', function () {

        var font_size_min = saya.settings.font_size.min;
        var font_size_max = saya.settings.font_size.max;
        for (var i = font_size_min; i <= font_size_max; i++) {

            $('.font-content').removeClass("font-size-" + i)
        }
        var value = $(this).val();
        saya.font_size = parseInt(value);
        $('.font-content').addClass("font-size-" + value);
        console.log('change .font-content to ' + value);
        localforage.setItem('font_size', saya.font_size);
    });

    // lấy ra thông tin customer info
    localforage.getItem('customer_info', function (error, value) {

        if (_.isObject(value)) {

            saya.customer_info = value;
            saya.setCustomerName();
        }
    });

    document.addEventListener('pause', saya.onPause, false);
    document.addEventListener('resume', saya.onResume, false);

    // xử lý khi thay đổi mạng
    document.addEventListener('offline', saya.onOffline, false);
    document.addEventListener('online', saya.onOnline, false);

    // vô hiệu hóa nút back
    if (device.platform == "windows") {

        // Get the back button working in WP8.1
        WinJS.Application.onbackclick = function (event) {

            // saya.onBackKeyDown();
           
            var currentHash = window.location.hash;
            console.log('currentHash: ' + currentHash);
            if (currentHash == saya.homepage) {

                window.close();
            }

            window.history.back();
            return true;
        }
    }
    else {

        document.addEventListener("backbutton", saya.onBackKeyDown, false);
    }

    $('.exit-app').on('click', function () {

        saya.exitApp();
        return false;
    });

    $('a.menu').on('click', function () {

        var hash = $(this).attr('href');
        if (hash == window.location.hash) {

            console.log('click menu was trigger to navigate the same page ' + hash);
            var $pannel = $(this).closest('div[data-role="panel"]');
            $pannel.panel("close");
            return false;
        }
    });

    $('a.share').on('click', function () {

        if (window.plugins.socialsharing) {

            window.plugins.socialsharing.share(saya.settings.share_message, saya.settings.share_subject, saya.settings.share_image, saya.settings.share_link);
        }

        return false;
    });

    $('select.region-parent').on('change', function () {

        console.log('select.region-parent was trigger change');
        var parent = $(this).val();
        var $self = $(this);

        if (!parent) {

            var opts = '<option value="">Quận/Huyện/Thị xã</option>';
            var $region_child = $self.closest('.region').find('select.region-child');
            $region_child.html(opts);
            $region_child.selectmenu("refresh");
            return;
        }

        localforage.getItem('settings', function (err, value) {

            var regions = value.regions;
            var region_child = regions.child[parent];
            var opts = '<option value="">Quận/Huyện/Thị xã</option>';
            opts += saya.helper.renderOpts(region_child);
            var $region_child = $self.closest('.region').find('select.region-child');
            $region_child.html(opts);
            if (saya.region_id && region_child.hasOwnProperty(saya.region_id)) {

                $region_child.val(saya.region_id);
            }
            $region_child.selectmenu("refresh");
        });
    });

    $('.region_submit').on("click", function () {

        console.log('.region_submit click event was trigger');
        var $region_parent = $(this).closest('div[role="main"]').find('select.region-parent');
        var $region_child = $(this).closest('div[role="main"]').find('select.region-child');

        var parent = $region_parent.val();
        var child = $region_child.val();

        if (!parent || !child) {

            console.log('Can not set, because .region-parent or .region-child is empty');
            return false;
        }

        var parent_name = $region_parent.find('option:selected').text();
        var child_name = $region_child.find('option:selected').text();

        // xác định xem có phải xóa toàn bộ giỏ hàng hay không?
        // sẽ xóa giỏ hàng nếu khách hàng thay đổi region
        var empty_cart = $(this).data('empty_cart');
        if (empty_cart && saya.region_id != child) {

            saya.emptyCart();
            saya.emptyNotification();
        }

        saya.region_parent_id = parent;
        saya.region_id = child;

        saya.region_parent_name = parent_name;
        saya.region_name = child_name;

        var region_submit = {
            parent: parent,
            child: child,
            parent_name: parent_name,
            child_name: child_name,
        };

        console.log('localforage.region_submit is setting ...');
        console.log(region_submit);
        localforage.setItem('region_submit', region_submit);
    });

    // xử lý khi xóa item trong giỏ hàng
    $("#cart-confirm-ok").on('click', function () {

        if (_.isEmpty(saya.cart_item_remove)) {

            console.log('Cart item needed to remove was empty.');
            return;
        }

        var $cart_item = $('#' + 'cart-item-' + saya.cart_item_remove.id);
        $cart_item.remove();
        saya.cart.get(saya.cart_item_remove.id).destroy();
        saya.cart_item_remove = {};

        var total_price = saya.caculateCartTotalPrice(saya.cart.toJSON());
        saya.displayCartTotalPrice(total_price);

        // kiểm tra nếu giỏ hàng đã bị xóa hết thì điều hướng về màn hình #category-page
        if (!$('#cart-list').find('li[id^="cart-item-"]').length) {

            $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
            return false;
        }
    });

    // xử lý khi không xóa item trong giỏ hàng
    $("#cart-confirm-cancel").on('click', function () {

        if (_.isEmpty(saya.cart_item_remove)) {

            console.log('Cart item needed to remove was empty.');
            return;
        }

        var $slider = $('#slider-' + saya.cart_item_remove.id);
        $slider.val(saya.cart_item_remove.qty);
        $slider.slider("refresh");
        saya.cart_item_remove = {};
    });

    $("#cart-confirm-remove").on("popupafterclose", function (event, ui) {

        if (_.isEmpty(saya.cart_item_remove)) {

            console.log('Cart item needed to remove was empty.');
            return;
        }

        var $slider = $('#slider-' + saya.cart_item_remove.id);
        $slider.val(saya.cart_item_remove.qty);
        $slider.slider("refresh");
        saya.cart_item_remove = {};
    });

    // Khi thực hiện ấn vào nút "Đặt hàng"
    $('.checkout-ok').on('click', function () {

        console.log('.checkout-ok was trigger click');
        console.log('Customer info:');
        console.log(saya.customer_info);
        console.log('Cart info:');
        var cart = saya.cart.toJSON();
        console.log(cart);

        // thực hiện parse lại cấu trúc data
        var order = {};
        order.customer = {
            code: saya.customer_id,
            name: saya.customer_info.fullname,
            mobile: saya.customer_info.mobile,
            mobile2: saya.customer_info.mobile2,
            address: saya.customer_info.address,
        };
        order.region_id = saya.region_id;
        order.region_name = saya.region_name;
        order.region_parent_id = saya.region_parent_id;
        order.region_parent_name = saya.region_parent_name;
        order.platform_os = device.platform;
        order.platform_version = device.version;

        // thực hiện parse lại cấu trúc cart
        order.cart = [];
        _.each(cart, function (item, index) {

            order.cart.push({
                id: item.id,
                qty: item.qty,
            });
        });

        var order_json = JSON.stringify(order);
        console.log('order_json:');
        console.log(order_json);
        console.log('Order info:');
        console.log(order);

        // thực hiện request lên server
        var order_create = saya.config.serviceDomain + saya.config.serviceOrderCreate.path;
        console.log('order_create = ' + order_create);
        $.mobile.loading('show', {
            text: "Đang xử lý...",
            textVisible: true,
        });
        var req = $.get(order_create, { order: order_json }, function (res) {

            $.mobile.loading('hide');
            if (res.status == 'success') {

                console.log('create the order successful.');
                console.log('Order info:');
                console.log(res);

                var data = res.data;

                // thực hiện ghi đè lại thông tin đơn hàng của customer
                saya.saveCustomerOrder(data);

                // thực hiện xóa thông tin đơn hàng
                saya.emptyCart();

                // thực hiện bật popup báo thành công
                saya.openCheckoutSuccessPopup(saya.settings.checkout_success);

            } else {

                console.log('create the order fail.');
                console.log('Error info:');
                console.log(res);

                // thực hiện bật popup báo thất bại
                saya.openSystemPopup(saya.settings.checkout_error);
            }

        }, 'json');

        req.fail(function (jqXHR, textStatus, errorThrown) {

            console.log('Request to create the order was error.');
            $.mobile.loading('hide');
        });

        return false;
    });

    // thực hiện điều hướng về trang category, khi đặt hàng thành công
    $('#checkout-success').on('popupafterclose', function (event, ui) {

        console.log('#checkout-success popupafterclose event was trigger');
        console.log('return to #category-page');
        $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
    });

    // thực hiện scroll tới cuối "Lịch sử đơn hàng" --> load tiếp các đơn hàng đã có
    var locked = 0; // cờ khóa scroll event, tránh thực hiện scroll 2 lần liên tiếp khi sự kiện scroll trước chưa load xong
    $(window).on('scrollstop', function () {

        console.log('scroll event was trigger.');

        // lấy ra page đang active
        var $activePage = $(":mobile-pagecontainer").pagecontainer("getActivePage");
        console.log('$activePage:');
        console.log($activePage);

        if ($activePage.attr('id') == 'order-page') {

            // nếu bị khóa
            if (locked) {

                console.log('scroll is locked.');
                return false;
            }

            if (saya.order_distributor_page <= 0) {

                console.log('Have no any order to load.');
                return false;
            }

            var offset = 500;
            if ($(window).scrollTop() + offset >= $('#order-list').offset().top + $('#order-list').outerHeight() - window.innerHeight) {

                saya.order_page_load = saya.order_page_load - 1;
                if (saya.order_page_load <= 0) {

                    console.log('No more order to load.');
                    return false;
                }

                $.mobile.loading('show');

                locked = 1;
                var orderCollection = new saya.OrderCollection([], { page: saya.order_page_load });
                orderCollection.fetch({
                    cache: false,
                    success: function (collection, response, options) {

                        var orderListView = new saya.OrderListView({ collection: collection, append: true });
                        orderListView.render();

                        $("#order-list").collapsibleset("refresh");
                        $.mobile.loading('hide');
                        locked = 0;
                    },
                    error: function (collection, response, options) {

                        console.log('fetch orderCollection was failed. error detail:');
                        console.log(response);
                        $.mobile.loading('hide');
                        saya.order_page_load = saya.order_page_load + 1;
                        locked = 0;
                    },
                });

            }
        }

    });

    // Khi thực hiện ấn nút "Tiếp theo" trong #cart-page để tới màn hình thanh toán
    $('#checkout').on('click', function () {

        var customer = {
            fullname: $.trim($('#fullname').val()),
            mobile: $.trim($('#mobile').val()),
            mobile2: $.trim($('#mobile2').val()),
            address: $.trim($('#address').val()),
        };

        saya.customer_info = customer;
        // Thực hiện thiết lập tên người đặt hàng ở tiêu đề thanh menu
        saya.setCustomerName();

        localforage.setItem('customer_info', customer);

        if (!customer.fullname.length || !customer.mobile.length || !customer.address.length) {

            saya.openSystemPopup(saya.settings.not_fullfill_form);
            return false;
        }
    });

    $('#checkout-confirm-yes').on('click', function () {

        saya.emptyCart();
        $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
        return false;
    });

    // thực hiện xóa bỏ set timeout khi popup bị tắt giữa chừng
    $('#system-popup').on('popupafterclose', function (event, ui) {

        console.log('#system-popup popupafterclose event was trigger');
        if (saya.openSystemPopupTimeout) {

            console.log('clearTimeout saya.openSystemPopupTimeout');
            clearTimeout(saya.openSystemPopupTimeout);
        }
    });

    // Khi thực hiện ấn vào nút "Gửi"
    $('#contact-submit').on('click', function () {

        var name = $.trim($('#contact-name').val());
        var description = $.trim($('#contact-description').val());

        var params = {};
        params.name = name;
        params.description = description;
        params.platform_os = device.platform;
        params.platform_version = device.version;

        var customer_code = saya.customer_id;
        params.customer_code = customer_code;

        // Lấy ra thông tin customer
        localforage.getItem('customer_info', function (err, value) {

            if (_.isObject(value)) {

                var customer_name = value.fullname;
                var customer_mobile = value.mobile;
                var customer_mobile2 = value.mobile2;

                params.customer_name = customer_name;
                params.customer_mobile = customer_mobile;
                params.customer_mobile2 = customer_mobile2;
            }

            var feedback_service = saya.config.serviceDomain + saya.config.serviceFeedbackCreate.path;
            $.mobile.loading('show', {
                text: "Đang gửi...",
                textVisible: true,
            });
            var req = $.post(feedback_service, params, function (data) {

                $.mobile.loading('hide');
                if (data.status == 'success') {

                    saya.openFeedbackSuccessPopup(saya.settings.feedback_success);
                } else {

                    saya.openSystemPopup(saya.settings.feedback_error);
                }
            });

            req.fail(function (jqXHR, textStatus, errorThrown) {

                $.mobile.loading('hide');
                saya.openSystemPopup(saya.settings.feedback_error);
            });
        });
    });

    // thực hiện điều hướng về trang category, khi feedback thành công
    $('#feedback-success').on('popupafterclose', function (event, ui) {

        console.log('#feedback-success popupafterclose event was trigger');
        console.log('return to #category-page');
        $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
    });

    $(document).on("pagecontainerbeforeshow", function (event, ui) {

        console.log('document: pagecontainerbeforeshow trigger');
        var $toPage = ui.toPage;
        var page_id = $toPage.attr('id');
        console.log('page_id: ' + page_id);

        if (page_id == 'region-page') {

            saya.settingPromise.done(function () {

                var $region_parent = $toPage.find('select.region-parent');
                console.log('region-page: render data from localforage.settings');
                localforage.getItem('settings', function (err, value) {

                    var region_parent = value.regions.parent;
                    var opts = '<option value="">Tỉnh/Thành phố</option>';
                    opts += saya.helper.renderOpts(region_parent);
                    $region_parent.html(opts);
                    console.log('region-page: set select.region-parent value to ' + saya.region_parent_id);
                    $region_parent.val(saya.region_parent_id);
                    $region_parent.selectmenu("refresh");
                    $region_parent.trigger('change');
                });
            });
        } else if (page_id == 'region-edit-page') {

            var $region_parent = $toPage.find('select.region-parent');
            console.log('region-edit-page: render data from localforage.settings');
            localforage.getItem('settings', function (err, value) {

                var region_parent = value.regions.parent;
                $region_parent.html(saya.helper.renderOpts(region_parent));
                if (saya.region_parent_id.length) {

                    $region_parent.val(saya.region_parent_id);
                }
                $region_parent.selectmenu("refresh");
                $region_parent.trigger('change');
            });
        } else if (page_id == 'category-page') {

            console.log('category-page: fetch and render remote data');
            $('body').spin();
            var categories = new saya.CategoryCollection();
            var fetchCategories = categories.fetch();
            $toPage.find('#catgory-list').html('');
            fetchCategories.done(function (data, textStatus, jqXHR) {

                localforage.setItem('categories', data);
                var categoryListView = new saya.CategoryListView({ collection: categories });
                var categoryListViewHtml = categoryListView.render();
                $toPage.find('#catgory-list').append(categoryListViewHtml.el);
                $toPage.find('ul[data-role="listview"]').listview();
                $('body').spin(false);
            });

            fetchCategories.fail(function (jqXHR, textStatus, errorThrown) {
                console.log('category-page: fetch data was failed');
                console.log(jqXHR);
                if (jqXHR.status === 404) {
                    console.log('Append Welcome List View');
                    var categoryWelcomeListView = new saya.CategoryWelcomeListView();
                    var categoryWelcomeListHtml = categoryWelcomeListView.render();
                    $toPage.find('#catgory-list').append(categoryWelcomeListHtml.el);
                    $toPage.find('ul[data-role="listview"]').listview();
                }
             
                $('body').spin(false);
            });

            saya.notificationPromise = saya.fetchNotification();
            saya.notificationPromise.done(function (notifications) {

                console.log('notifications:');
                console.log(notifications);

                if (_.isEmpty(notifications)) {

                    return;
                }

                // thực hiện phân tích, trích xuất ra notification vẫn đang còn hiệu lực
                var show_notifications = [];
                var current_time = moment().valueOf();
                _.each(notifications, function (item, index) {

                    var begin_at = moment(item.begin_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                    var end_at = moment(item.end_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                    if (current_time >= begin_at && current_time <= end_at) {

                        show_notifications.push(item);
                    }
                });

                if (_.isEmpty(show_notifications)) {

                    return;
                }

                (function myLoop(i) {

                    var current_time = moment().valueOf();
                    var begin_at = moment(show_notifications[i - 1].begin_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                    var end_at = moment(show_notifications[i - 1].end_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                    if (current_time < begin_at || current_time > end_at) {

                        delete show_notifications[i - 1];
                        show_notifications = _.compact(show_notifications);
                        if (!show_notifications.length) {
                            $('.marquee').html('');
                            $('.marquee').marquee('destroy');
                            return;
                        }
                    }

                    $('.marquee').html(show_notifications[i - 1].description);
                    $('.marquee').marquee({
                        // pauseOnHover: true,
                    }).bind('finished', function () {
                        $(this).marquee('destroy');
                        var current_time = moment().valueOf();
                        var begin_at = moment(show_notifications[i - 1].begin_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                        var end_at = moment(show_notifications[i - 1].end_at, "YYYY-MM-DD HH:mm:ss").valueOf();
                        if (current_time < begin_at || current_time > end_at) {

                            delete show_notifications[i - 1];
                            show_notifications = _.compact(show_notifications);
                            if (!show_notifications.length) {
                                $(this).html('');
                                $(this).marquee('destroy');
                                return;
                            }
                        }
                        $(this).html(show_notifications[i - 1].description).marquee();
                        if (--i) {

                            myLoop(i);
                        } else {

                            i = show_notifications.length;
                            myLoop(i);
                        }
                    }).unbind('vmouseover vmouseout').bind('vmouseover vmouseout', function () {

                        $(this).marquee('toggle');
                    });
                })(show_notifications.length);
            });

            saya.notificationPromise.fail(function () {

                $('.marquee').html('');
                $('.marquee').marquee('destroy');
            });
        } else if (page_id == 'product-page') {

            console.log('product-page: fetch and render remote data');
            $('body').spin();
            var products = new saya.ProductCollection();
            var fetchProducts = products.fetch();
            $toPage.find('div[role="main"]').html('');
            fetchProducts.done(function (data, textStatus, jqXHR) {

                localforage.setItem('products', data);
                if (data.length) {

                    var productListView = new saya.ProductListView({ collection: products });
                    var productListViewHtml = productListView.render();
                    $toPage.find('div[role="main"]').append(productListViewHtml.el);
                    $toPage.find('ul[data-role="listview"]').listview();
                    productListView.expand();
                } else {

                    $toPage.find('div[role="main"]').html(saya.settings.empty_product_in_region);
                    $toPage.trigger('create');
                }

                $('body').spin(false);
            });

            fetchProducts.fail(function () {
                console.log('fetchProducts was failed');
                $toPage.find('div[role="main"]').html(saya.settings.empty_product_in_region);
                $toPage.trigger('create');
                $('body').spin(false);
            });
        } else if (page_id == 'cart-page') {

            console.log('cart-page: saya.cart fetch');
            saya.cart.fetch({
                success: function (collection, response, options) {

                    var cart = saya.cart.toJSON();
                    var total_price = saya.caculateCartTotalPrice(cart);
                    saya.displayCartTotalPrice(total_price);

                    var $cartPage = $toPage.find('#cart-list');
                    var $cartFooter = $toPage.find('div[data-role="footer"]');

                    console.log('cart-page: render data from saya.cart');
                    if (cart.length) {

                        console.log('cart-page: render data from saya.cart');
                        var cartListView = new saya.CartListView({ collection: saya.cart });
                        var cartListViewHtml = cartListView.render();

                        $cartPage.html('');
                        $cartPage.append(cartListViewHtml.el);
                        $cartFooter.find('a[href="#customer-page"]').show();
                    } else {

                        var message = '<div class="ui-content">' + saya.settings.empty_cart + '</div>';
                        $cartPage.html(message);
                        $cartFooter.find('a[href="#customer-page"]').hide();
                    }

                    $toPage.trigger('create');
                },
            });
        } else if (page_id == 'customer-page') {

            console.log('customer-page: render data');
            $toPage.find('.region_parent').text(saya.region_parent_name);
            $toPage.find('.region').text(saya.region_name);

            localforage.getItem('customer_info', function (err, value) {

                if (!value) {

                    return;
                }

                saya.customer_info = value;
                saya.setCustomerName();
                $('#fullname').val(value.fullname);
                $('#mobile').val(value.mobile);
                $('#mobile2').val(value.mobile2);
                $('#address').val(value.address);
            });
        } else if (page_id == 'checkout-page') {

            console.log('checkout-page: render data');
            var checkoutListView = new saya.CheckoutListView({ collection: saya.cart });
            checkoutListView.render();

            var total_price = saya.caculateCartTotalPrice(saya.cart.toJSON());
            $('.checkout-total-price').text(saya.utli.numberFormat(total_price));

            var checkoutCustomerModel = saya.customer_info;
            checkoutCustomerModel.region_parent_name = saya.region_parent_name;
            checkoutCustomerModel.region_name = saya.region_name;

            var checkoutCustomerView = new saya.CheckoutCustomerView({ model: checkoutCustomerModel });
            checkoutCustomerView.render();

            $toPage.trigger('create');
        } else if (page_id == 'about-page') {

            console.log('about-page: render data');
            $toPage.find('div[role="main"]').html(saya.settings.about_us);
        } else if (page_id == 'order-page') {

            console.log('order-page: render data');
            // nếu Lịch sử đơn hàng rỗng, hiện thị message
            if (saya.order_distributor_page <= 0) {

                $('#order-list').html(saya.settings.order_empty);
            } else {

                console.log('reset saya.order_page_load = saya.order_distributor_page = ' + saya.order_distributor_page);
                $('body').spin();
                saya.order_page_load = saya.order_distributor_page;

                var orderCollection = new saya.OrderCollection();
                orderCollection.fetch({
                    cache: false,
                    success: function (collection, response, options) {
                        console.log('fetchOrderCollection  was successful');
                        var orderListView = new saya.OrderListView({ collection: collection });
                        orderListView.render();

                        // $toPage.trigger('create');
                        $("#order-list").collapsibleset("refresh");
                        $('body').spin(false);

                        if ($("#order-list").outerHeight() <= $(window).height()) {
                            $(window).trigger('scrollstop');
                        }
                    },
                    fail: function (jqXHR, textStatus, errorThrown) {
                        console.log('fetchOrderCollection was failed');
                        if (jqXHR.status === 404) {
                            $('#order-list').html(saya.settings.order_empty);
                        }
                        $('body').spin(false);
                    },
                });
            }
        } else if (page_id == 'setting-page') {

            console.log('saya.font_size:' + saya.font_size);
            $('#font-range').val(saya.font_size);
            $('#font-range').trigger('change');
        } else if (page_id == 'welcome-page') {

            $toPage.find('.ui-content').html(saya.settings.category_welcome_content);
        }
    });

    $(document).on("pagecontainershow", function (event, ui) {

        console.log('document: pagecontainershow trigger');
        var activePage = $.mobile.pageContainer.pagecontainer("getActivePage");
        var page_id = activePage[0].id;
        console.log('page_id: ' + page_id);

        if (page_id == 'region-page') {

            // nếu app cần update và chưa hiện thị thông báo popup update lên lần nào thì hiện thị popup
            if (saya.is_update && saya.open_update_popup_count < 1) {

                // bật popup thông báo update
                saya.openUpdatePopup();
                // tăng +1 số lần hiện thị thông báo popup update
                saya.open_update_popup_count += 1;
            }
        } else if (page_id == 'category-page') {

            // nếu app cần update và chưa hiện thị thông báo popup update lên lần nào thì hiện thị popup
            if (saya.is_update && saya.open_update_popup_count < 1) {

                // bật popup thông báo update
                saya.openUpdatePopup();
                // tăng +1 số lần hiện thị thông báo popup update
                saya.open_update_popup_count += 1;
            }
        } else if (page_id == 'checkout-page') {

            //$.mobile.loading('show', {
            //    text: "Đang xử lý...",
            //    textVisible: true,
            //});
        }
    });

    // nếu người dùng đồng ý update app, thì mở ra link để download phiên bản mới
    $('#update-confirm-ok').on('click', function () {

        var open_download_link = cordova.InAppBrowser.open(saya.download_link, '_blank', 'location=yes');
    });

    //$('body').on('click','#ads-description a', function () {

    //    var link = $(this).attr('href');
    //    var open_link = cordova.InAppBrowser.open(link, '_blank', 'location=yes');
    //    return false;
    //});
};

saya.onPause = function () {

    console.log('Pause event was trigger');
    saya.setNotificationSchedule();
};

saya.onResume = function () {

    console.log('Resume event was trigger');
};

// khi kết nối mạng bị ngắt
saya.onOffline = function () {

    console.log('Offline event was trigger');
    if (saya.networkStatus !== 0) {

        console.log('Change saya.networkStatus = 0 & open NetworkPopup');
        saya.networkStatus = 0;
        saya.openNetworkPopup(saya.settings.offline_network);
    }
};

// khi kết nối mạng được khôi phục
saya.onOnline = function () {

    console.log('Online event was trigger');
    if (saya.networkStatus !== 1) {

        console.log('Change saya.networkStatus = 1 & change HomePage');
        saya.networkStatus = 1;
        saya.changeHomePage();
    }
};

saya.onBackKeyDown = function (event) {

    console.log('backkeydown was trigger');
    event.preventDefault();
};
