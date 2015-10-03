/// <reference path="libs/underscore.js" />
/// <reference path="libs/backbone.js" />
/// <reference path="libs/jquery-2.1.4.js" />
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
        serviceRoot: "app/webroot/cache/",
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
    saya.category_id = '';
    saya.customer_id = '';

    saya.Setting = Backbone.Model.extend({
        initialize: function () {
            this.config = saya.config;
        },
        url: function () {

            var url = this.config.serviceDomain + this.config.serviceRoot + this.config.serviceRegion.name;
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
        template: _.template('<a href="#" data-product_id="<%= id %>" data-transition="slide" data-role="button"><img src="<%= logo_path %>" class="ui-li-thumb"><h2><%= name %></h2></a>'),
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
    });

    saya.helper = {};
    saya.helper.renderOpts = function (pair) {

        var output = '';
        _.each(pair, function (val, key) {

            output += '<option value="' + key + '">' + val + '</option>';
        });

        return output;
    };

    document.addEventListener('deviceready', onDeviceReady.bind(this), false);

    function onDeviceReady() {
        // Handle the Cordova pause and resume events
        document.addEventListener( 'pause', onPause.bind( this ), false );
        document.addEventListener('resume', onResume.bind(this), false);

        FastClick.attach(document.body);

        $('#region_parent').on('change', function () {

            var parent = $(this).val();
            localforage.getItem('regions', function (err, regions) {
                if (err) {

                    console.error('Oh noes!');
                    console.log(err);
                } else {

                    var region_child = regions.child[parent];
                    $('#region_child').html(saya.helper.renderOpts(region_child));
                    $('#region_child').selectmenu("refresh");
                }
            });
        });

        $('#region_submit').on('click', function () {

            var parent = $('#region_parent').val();
            var child = $('#region_child').val();

            saya.region_parent_id = parent;
            saya.region_id = child;

            if (!parent.length || !child.length) {

                return false;
            }

            localforage.setItem('region_submit', { parent: parent, child: child }, function (err, value) {

                //$(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slide" });
            });
        });

        //$("#region-page").on("pagebeforecreate", function (event, ui) {

        //    localforage.getItem('region_submit', function (err, value) {

        //        if (!value) {

        //            $(":mobile-pagecontainer").pagecontainer("change", $('#category-page'), { transition: "slideup" });
        //        } else {


        //        }
        //    });
        //});

        //$("#category-page").on("pagebeforecreate", function (event) {

        //    console.log('#category-page: pagebeforecreate trigger');
        //    var categories = new saya.CategoryCollection();
        //    var fecthCategories = categories.fetch();
        //    var $self = $(this);
        //    $self.find('div[role="main"]').html('');
        //    fecthCategories.done(function (data, textStatus, jqXHR) {

        //        localforage.setItem('categories', data);
        //        var categoryListView = new saya.CategoryListView({ collection: categories });
        //        var categoryListViewHtml = categoryListView.render();
        //        $self.find('div[role="main"]').append(categoryListViewHtml.el);
        //        $self.find('ul[data-role="listview"]').listview();
        //    });

        //});

        //$("#product-page").on("pagebeforecreate", function (event) {

        //    var products = new saya.ProductCollection();
        //    var fecthProducts = products.fetch();
        //    var $self = $(this);
        //    $self.find('div[role="main"]').html('');
        //    fecthProducts.done(function (data, textStatus, jqXHR) {

        //        localforage.setItem('products', data);
        //        var productListView = new saya.ProductListView({ collection: products });
        //        var productListViewHtml = productListView.render();
        //        $self.find('div[role="main"]').append(productListViewHtml.el);
        //        $self.find('ul[data-role="listview"]').listview();
        //    });

        //});

        var setting = new saya.Setting();
        var fecthSetting = setting.fetch();
        fecthSetting.done(function (data, textStatus, jqXHR) {

            localforage.setItem('regions', data);
            var region_parent = data.parent;
            $('#region_parent').html(saya.helper.renderOpts(region_parent));
            $('#region_parent').selectmenu("refresh");
            $('#region_parent').trigger('change');
        });

        fecthSetting.fail(function (jqXHR, textStatus, errorThrown) {

            alert(errorThrown);
        });

        $(document).on("pagecontainerbeforeshow", function (event, ui) {

            console.log('document: pagecontainerbeforeshow trigger');
            var $toPage = ui.toPage;
            var page_id = $toPage.attr('id');
            console.log('page_id: ' + page_id);
            if (page_id == 'region-page') {

                console.log('region-page: fetch and render remote data');
                var setting = new saya.Setting();
                var fecthSetting = setting.fetch();
                fecthSetting.done(function (data, textStatus, jqXHR) {

                    localforage.setItem('regions', data);
                    var region_parent = data.parent;
                    $('#region_parent').html(saya.helper.renderOpts(region_parent));
                    $('#region_parent').selectmenu("refresh");
                    $('#region_parent').trigger('change');
                });

                fecthSetting.fail(function (jqXHR, textStatus, errorThrown) {

                    alert(errorThrown);
                });

            }else if (page_id == 'category-page') {

                console.log('category-page: fetch and render remote data');
                $.mobile.loading("show");
                var categories = new saya.CategoryCollection();
                var fecthCategories = categories.fetch();
                $toPage.find('div[role="main"]').html('');
                fecthCategories.done(function (data, textStatus, jqXHR) {

                    localforage.setItem('categories', data);
                    var categoryListView = new saya.CategoryListView({ collection: categories });
                    var categoryListViewHtml = categoryListView.render();
                    $toPage.find('div[role="main"]').append(categoryListViewHtml.el);
                    $toPage.find('ul[data-role="listview"]').listview();
                    $.mobile.loading("hide");
                });
            } else if (page_id == 'product-page') {

                console.log('product-page: fetch and render remote data');
                $.mobile.loading("show");
                var products = new saya.ProductCollection();
                var fecthProducts = products.fetch();
                $toPage.find('div[role="main"]').html('');
                fecthProducts.done(function (data, textStatus, jqXHR) {

                    localforage.setItem('products', data);
                    var productListView = new saya.ProductListView({ collection: products });
                    var productListViewHtml = productListView.render();
                    $toPage.find('div[role="main"]').append(productListViewHtml.el);
                    $toPage.find('ul[data-role="listview"]').listview();
                    $.mobile.loading("hide");
                });
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