/// <reference path="libs/underscore.js" />
/// <reference path="libs/backbone.js" />
/// <reference path="libs/jquery-2.1.4.js" />
/// <reference path="libs/jquery.spin.js" />
/// <reference path="libs/localforage.backbone.js" />
/// <reference path="libs/jquery.mobile-1.4.5.js" />
/// <reference path="libs/localforage.js" />
// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=397704
// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console.

(function () {
    "use strict";

    var saya = {};
    saya.config = {
        serviceDomain: "http://saya-backend.16mb.com/saya_backend/",
        //serviceDomain: "http://localhost/saya_backend/",
        //serviceDomain: "http://192.168.5.115/saya_backend/",
        serviceRoot: "app/webroot/cache/",
        serviceSetting: {
            name: 'settings.json',
        },
        serviceRegion: {
            name: 'regions.json',
        },
        serviceCategory: {
            name: 'categories.json',
        },
        serviceProduct: {
            path: 'products/',
            pattern: '{region_id}_{category_id}.json',
        },
    };
    saya.region_parent_id = '';
    saya.region_id = '';
    saya.region_parent_name = '';
    saya.region_name = '';
    saya.category_id = '';
    saya.customer_id = '';
    saya.customer_info = {};
    saya.product_expand = '';
    saya.cart_item_remove = {};

    saya.settings = {};
    saya.settings.max_product_qty = 3;
    saya.settings.popup_timeout = 3;
    saya.settings.add_cart_than_max = 'Số lượng sản phẩm không thể đặt vượt quá 3 sản phẩm.';
    saya.settings.not_exist_region = 'Quận/Huyện/Thị xã mà bạn đã chọn không còn tồn tại, hãy thực hiện chọn lại vùng khác.';
    saya.settings.empty_cart = 'Giỏ hàng hiện tại không chứa sản phẩm nào.';

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

                value = device.uuid | saya.utli.guid();
                localforage.setItem('customer_id', value);
            }

            saya.customer_id = value;
        });
    };
    saya.openSystemPopup = function (message,timeout) {

        if (typeof timeout === "undefined") {

            timeout = saya.settings.popup_timeout;
        }

        $("#system-popup-content").html(message);
        $("#system-popup").popup();
        $("#system-popup").popup("open", {
            positionTo: "window",
            transition: "pop",
        });

        setTimeout(function () {

            $("#system-popup").popup('close');
        }, timeout * 1000);
    };
    saya.checkRegionSubmit = function (regions) {

        // kiểm tra tính hợp lệ của region nếu khách hàng đã chọn region từ trước
        if (saya.region_id.length) {

            if (!regions.parent.hasOwnProperty(saya.region_parent_id) || !regions.child.hasOwnProperty(saya.region_id)) {

                saya.openSystemPopup(saya.settings.not_exist_region);
                setTimeout(function () {

                    $(":mobile-pagecontainer").pagecontainer("change", $('#region-page'), { transition: "slide" });
                    return;
                }, (saya.settings.popup_timeout + 0.5) * 1000);
            }

        }
    };
    saya.updateRegionSubmit = function (parent_name,child_name) {

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

                console.log('get data from localforage.region_submit:');
                console.log(value);

                // thiết lập giá trị liên quan tới region vào biến toàn cục
                saya.region_parent_id = value.parent;
                saya.region_id = value.child;
                saya.region_parent_name = value.parent_name;
                saya.region_name = value.child_name;
            } else {

                console.log('navigate to #region-page');
                window.location.hash = '#region-page';
            }

            $.mobile.initializePage();
        });
    };
    saya.fecthSetting = function () {

        $('body').spin();
        var setting = new saya.Setting();
        var fecthSetting = setting.fetch();
        fecthSetting.done(function (data, textStatus, jqXHR) {

            localforage.setItem('settings', data);

            // ghi đè cấu hình settings nhận từ server xuống client
            _.each(data, function (value, key) {

                console.log('override saya.settings.'+key+' from server');
                if (_.isObject(value)) {

                    return;
                }
                saya.settings[key] = value;
            });

            // kiểm tra tính hợp lệ của region nếu khách hàng đã chọn region từ trước
            var regions = data.regions;
            saya.checkRegionSubmit(regions);

            // thực hiện update tên name của region nhận từ server
            var region_parent_name = regions.parent[saya.region_parent_id];
            var region_name = regions.child[saya.region_id];
            saya.updateRegionSubmit(region_parent_name, region_name);
            $('body').spin(false);
        });

        fecthSetting.fail(function (jqXHR, textStatus, errorThrown) {

            alert(errorThrown);
            $('body').spin(false);
        });
    };
    saya.exitApp = function () {

        console.log('Exit app');
        navigator.app.exitApp();
    };
    saya.emptyCart = function () {

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

            return this.config.serviceDomain + this.config.serviceRoot + this.config.serviceCategory.name;
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

    saya.CartCollection = Backbone.Collection.extend({
        initialize: function () {
            this.config = saya.config;
        },
        model: saya.Cart,
        sync: Backbone.localforage.sync('carts'),
    });

    saya.CategoryListView = Backbone.View.extend({
        el: '<ul data-role="listview" data-inset="true" />',
        render: function () {
            var models = this.collection.models;
            var self = this;
            var list = '';
            _.each(models, function (model, index) {

                var categoryItem = new saya.CategoryItemView({ model: model, index: index });
                self.$el.append(categoryItem.el);
            });

            return this;
        },
    });

    saya.ProductListView = Backbone.View.extend({
        el: '<ul data-role="listview" data-inset="true" />',
        render: function () {
            var models = this.collection.models;
            var self = this;
            var list = '';
            _.each(models, function (model, index) {

                var productItem = new saya.ProductItemView({ model: model, index: index });
                self.$el.append(productItem.el);
            });

            return this;
        },
        expand: function () {

            if (!saya.product_expand.length) {

                return;
            }

            console.log('Product with id=' + saya.product_expand+' need to expand');
            var $product_expand = $(saya.product_expand);
            console.log($product_expand);
            saya.product_expand = '';

            // thực hiện scroll tới vị trí product đã được expand
            var offset = $product_expand.offset();
            console.log('Product needed to expand has offset:');
            console.log(offset);

            console.log('Scroll to expanded product');
            $('html, body').animate({
                scrollTop: offset.top
            }, 2000);

            $product_expand.trigger('click');
        },
    });

    saya.CartListView = Backbone.View.extend({
        el: '<ul data-role="listview" data-inset="true" />',
        render: function () {
            var models = this.collection.models;
            var self = this;
            var list = '';
            _.each(models, function (model, index) {

                var cartItem = new saya.CartItemView({ model: model});
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
            var list = '';
            self.$el.html('');
            _.each(models, function (model, index) {

                var cartItem = new saya.CheckoutItemView({ model: model });
                self.$el.append(cartItem.el);
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

            variables.serialize = JSON.stringify(variables);
            variables.price = saya.utli.numberFormat(parseFloat(variables.price));

            console.log('Product item detail:');
            console.log(variables);

            var template = this.template(variables);

            this.$el.html(template);
            return this;
        },
        events: {
            "click .cart": "onCartButtonClick",
            "click": "onProductItemClick",
        },
        onProductItemClick: function(event){

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
            event.stopPropagation();
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
                    var new_qty = model.get('qty') + 1;
                    // thực hiện kiểm tra nếu số lượng qty vượt quá số lượng qty cho phép thì thực hiện popup cảnh báo
                    if (new_qty > saya.settings.max_product_qty) {

                        saya.openSystemPopup(saya.settings.add_cart_than_max);
                        return false;
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

            variables.serialize = JSON.stringify(variables);
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
        onChangeSuccess: function(){

            var total_price = saya.caculateCartTotalPrice(saya.cart.toJSON());
            saya.displayCartTotalPrice(total_price);
        },
        onChangeError: function () {

        },
        onClick: function (event) {

            var $self = $(event.currentTarget);
            saya.product_expand = $self.data('expand');
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

            variables.serialize = JSON.stringify(variables);
            variables.price = saya.utli.numberFormat(parseFloat(variables.price));

            console.log('Checkout item detail:');
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

    // khởi tạo luôn cartCollection toàn cục, dùng chung cho cả ứng dụng
   saya.cart = new saya.CartCollection();

    document.addEventListener('deviceready', onDeviceReady.bind(this), false);

    function onDeviceReady() {

        // FastClick.attach(document.body);

        document.addEventListener( 'pause', onPause.bind( this ), false );
        document.addEventListener('resume', onResume.bind(this), false);

        saya.initializePage();
        saya.setCustomerId();
        saya.fecthSetting();

        $('.exit-app').on('click', function () {

            saya.exitApp();
            return false;
        });

        $('a.menu').on('click', function () {

            var hash = $(this).attr('href');
            if (hash == window.location.hash) {

                return false;
            }
        });

        $('select.region-parent').on('change', function () {

            console.log('select.region-parent was trigger change');
            var parent = $(this).val();
            var $self = $(this);
            localforage.getItem('settings', function (err, value) {
                if (err) {

                    console.error('Oh noes!');
                    console.log(err);
                } else {

                    var regions = value.regions;
                    var region_child = regions.child[parent];
                    var opts = '<option value="">Quận/Huyện/Thị xã</option>';
                    opts += saya.helper.renderOpts(region_child);
                    var $region_child = $self.closest('.region').find('select.region-child');
                    $region_child.html(opts);
                    if (saya.region_id.length) {

                        $region_child.val(saya.region_id);
                    }
                    $region_child.selectmenu("refresh");
                }
            });
        });

        $('.region_submit').on("click", function () {

            var $region_parent = $(this).closest('div[role="main"]').find('select.region-parent');
            var $region_child = $(this).closest('div[role="main"]').find('select.region-child');

            var parent = $region_parent.val();
            var child = $region_child.val();

            var parent_name = $region_parent.find('option:selected').text();
            var child_name = $region_child.find('option:selected').text();

            // xác định xem có phải xóa toàn bộ giỏ hàng hay không?
            // sẽ xóa giỏ hàng nếu khách hàng thay đổi region
            var empty_cart = $(this).data('empty_cart');
            if (empty_cart && saya.region_id != child) {

                saya.emptyCart();
            }

            saya.region_parent_id = parent;
            saya.region_id = child;

            saya.region_parent_name = parent_name;
            saya.region_name = child_name;

            if (!parent.length || !child.length) {

                return false;
            }

            localforage.setItem('region_submit', {
                parent: parent,
                child: child,
                parent_name: parent_name,
                child_name: child_name,
            });
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

        $('.checkout-ok').on('click', function () {

            saya.openSystemPopup(saya.settings.checkout_success);
            return false;
        });

        $('#checkout').on('click', function () {

            var customer = {
                fullname: $.trim($('#fullname').val()),
                mobile: $.trim($('#mobile').val()),
                mobile2: $.trim($('#mobile2').val()),
                address: $.trim($('#address').val()),
            };

            if (!customer.fullname.length || !customer.mobile.length || !customer.address.length) {

                saya.openSystemPopup(saya.settings.not_fullfill_form);
                return false;
            }

            saya.customer_info = customer;
            localforage.setItem('customer_info', customer);
        });

        $('#checkout-confirm-yes').on('click', function () {

            saya.emptyCart();
            $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
            return false;
        });

        $(document).on("pagecontainerbeforeshow", function (event, ui) {

            console.log('document: pagecontainerbeforeshow trigger');
            var $toPage = ui.toPage;
            var page_id = $toPage.attr('id');
            console.log('page_id: ' + page_id);

            if (page_id == 'region-page') {

                var $region_parent = $toPage.find('select.region-parent');
                console.log('region-page: render data from localforage.settings');
                localforage.getItem('settings', function (err, value) {

                    var region_parent = value.regions.parent;
                    var opts = '<option value="">Tỉnh/Thành phố</option>';
                    opts += saya.helper.renderOpts(region_parent);
                    $region_parent.html(opts);
                    $region_parent.selectmenu("refresh");
                    $region_parent.trigger('change');
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
                var fecthCategories = categories.fetch();
                $toPage.find('div[role="main"]').html('');
                fecthCategories.done(function (data, textStatus, jqXHR) {

                    localforage.setItem('categories', data);
                    var categoryListView = new saya.CategoryListView({ collection: categories });
                    var categoryListViewHtml = categoryListView.render();
                    $toPage.find('div[role="main"]').append(categoryListViewHtml.el);
                    $toPage.find('ul[data-role="listview"]').listview();
                    $('body').spin(false);
                });
            } else if (page_id == 'product-page') {

                console.log('product-page: fetch and render remote data');
                $('body').spin();
                var products = new saya.ProductCollection();
                var fecthProducts = products.fetch();
                $toPage.find('div[role="main"]').html('');
                fecthProducts.done(function (data, textStatus, jqXHR) {

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

                var checkoutCustomerView = new saya.CheckoutCustomerView({ model: saya.customer_info });
                checkoutCustomerView.render();

                $toPage.trigger('create');
            } else if (page_id == 'about-page') {

                console.log('about-page: render data');
                $toPage.find('div[role="main"]').html(saya.settings.about_us);
            }
        });
    };

    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    };

    function onResume() {
        // TODO: This application has been reactivated. Restore application state here.
    };
} )();