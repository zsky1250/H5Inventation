/**
 * Created by NN on 2016/5/15.
 */

;(function($){

    var yq = function(options){
        var defaults = {
            shortSwipe:true,
            timeThreshold:300,
            mapIndex:1,
            $mapContainer:$("#map"),
            menuIndex:2,
            scrollingIDs:"foodList,orderDetails",
            mainSwiperID:"main",
            subSwiperID:"menu",
            showMap:null,
            orderFinished:false,
            isPlaying:true,
            $category: $('#category'),
            $foodList: $('#foodList'),
            $orderDetail:$('#orderDetails'),
            $orderList : $("#orderDetailList"),
            $orderForm : $("#orderDetailForm"),
            $goToOrder:$('#OK'),
            $backToFood:$('#back,#goOn'),
            $clearAllOrders: $('#clearAll'),
            $orderSubmitBtn:$('#orderSubmit')
        }
        var opts = $.extend({},defaults,options);

        function init(){
            _initMusic();
            _initMenu();
            _initOrder();
            _showTotal();
            _buildScrollings();
            // _addPrarmToSwiper('paginationCustomRender',opts.paginationRender);
            _initSwipers();
        }

        function _initMenu(){
            opts.foodItems = {};

            //注册菜单tab点击事件
            opts.$category.on('click.zui','li',function(index){
                $(this).addClass('selected').siblings("li").removeClass('selected');
                opts.$foodList.find('.food-list-item').eq($(this).index('li')).show().siblings('li').hide();
                _resizeScrolling(opts.$foodList);
            });
            //初始化显示第一个菜单tab
            opts.$category.find('li').eq(0).addClass('selected').siblings("li").removeClass('selected');
            opts.$foodList.find('.food-list-item').eq(0).show().siblings('li').hide();

            //构建foodItems对象。
            opts.foodItems = {};
            opts.order = {totalPrice:0,totalQuantity:0};
            _fillFoodItemsByHtml(opts.foodItems,opts.order);

            //+事件处理
            opts.$foodList.on('click.zui','span.plus',function(){
                _plusQuantity($(this).parentsUntil('.food-list-item','[name]').attr('name'));
            });

            //-事件处理
            opts.$foodList.on('click.zui','span.minus',function(){
                _minusQuantity($(this).parentsUntil('.food-list-item','[name]').attr('name'));
            });


            //注册我点好了OK btn
            opts.$goToOrder.click(function(){
                _buildOrderlistHtmlbyFoodItems();
                _resizeScrolling(opts.$orderDetail);
                opts.subSwiper.unlockSwipes();
                opts.subSwiper.slideNext();
                opts.subSwiper.lockSwipes();
            });
        }


        function _plusQuantity(index){
            opts.order.totalPrice+=opts.foodItems[index].price;
            opts.order.totalQuantity++;
            _changeQuantityDisplay(index,++opts.foodItems[index].quantity,'plus');
        }

        function _minusQuantity(index){
            opts.order.totalPrice-=opts.foodItems[index].price;
            opts.order.totalQuantity--;
            _changeQuantityDisplay(index,--opts.foodItems[index].quantity,'minus');
        }

        function _clearQuantity(index){
            opts.order.totalPrice -= opts.foodItems[index].quantity*opts.foodItems[index].price;
            opts.order.totalQuantity -= opts.foodItems[index].quantity;
            opts.foodItems[index].quantity=0;
            _changeQuantityDisplay(index,opts.foodItems[index].quantity,'clear');
        }

        function _changeQuantityDisplay(index,num,op){
            $.each(opts.foodItems[index].$quantityHandlers,function(){
                if(!op){
                    if(num==1&&op=='plus'){
                        $(this).children('span.minus,span.num').show();
                    }else if(op=='clear'||(num==0&&op=='minus')){
                        $(this).children('span.minus,span.num').hide();
                    }
                }else{
                    if(num>0){
                        $(this).children('span.minus,span.num').show();
                    }else{
                        $(this).children('span.minus,span.num').hide();
                    }
                }
                $(this).children('span.num').html(num)
            });
            _showTotal();
        }

        function _initOrder(){
            _buildOrderlistHtmlbyFoodItems();
            //注册订单页删除某一项 事件
            opts.$orderList.on('click.zui','span.cancel',function(){
                //for food-item-list
                var $orderItem = $(this).parent();
                _clearQuantity($orderItem.attr('name'));
                // for order-list
                $orderItem.remove();
                _resizeScrolling(opts.$orderDetail);
            });
            //注册回到点菜页事件
            opts.$backToFood.click(function(){
                opts.subSwiper.unlockSwipes();
                opts.subSwiper.slidePrev();
                opts.subSwiper.lockSwipes();
            });
            //注册清空所有已点
            opts.$clearAllOrders.click(function(){
               opts.$orderList.find("li").each(function(){
                    _clearQuantity($(this).attr('name'));
                }).remove();
                _resizeScrolling(opts.$orderDetail);
            });
            opts.$orderSubmitBtn.click(function(){
                _hideOrderForm();
            });
        }

        function _hideOrderForm(){
            opts.$orderForm.hide();
            opts.$orderList.find('span.cancel').hide();
            opts.$backToFood.hide();
            _resizeScrolling(opts.$orderDetail);
        }

        function _showTotal(){
            $("span.total-price","#menu").html(opts.order.totalPrice+" 元");
            $("span.total-quantity","#menu").html(opts.order.totalQuantity+" 份");
        }



        function _buildOrderlistHtmlbyFoodItems(){
            var html = '';
            $.each(opts.foodItems,function(key,val){
                if(val.quantity>0){
                    html+='<li name="'+key+'"><span class="food-name">'+val.foodname+'</span><span class="cancel"></span><span class="food-quantity">'+val.price+'元</span><span class="food-price">'+val.quantity+'份</span></li>';
                }
            });
            if(html!=''){
                opts.$orderList.html(html);
            }
        }
        /**
         * 根据HTML内容填充foodItems、orders对象
         * @private
         */
        function _fillFoodItemsByHtml(foodItems,orders){
            opts.$foodList.find('.food-item').each(function(index){
                var id = $(this).attr('name');
                if(!id&&id.trim()=='') id=index;
                if($.isEmptyObject(foodItems[id])){
                    foodItems[id] = {$quantityHandlers:new Array()};
                    var price,quantity,$quantityHandler;
                    $quantityHandler = $(this).children("li.food-quantity");
                    quantity = $quantityHandler.children('span.num').html().trim();
                    quantity = quantity!=''?parseInt(quantity):0;
                    price = $(this).children('li.food-price').children('span').html().trim();
                    price = price!=''?parseFloat(price):0.0;
                    //赋值
                    foodItems[id].foodname = $(this).children('li.food-name').html()
                    foodItems[id].price = price;
                    foodItems[id].quantity = quantity;
                    foodItems[id].$quantityHandlers.push($quantityHandler);
                    //总价叠加
                    orders.totalQuantity+=quantity;
                    orders.totalPrice+=price*quantity;
                }else{
                    //重复的商品（可能在不同的分类中都包含，有中出现多次的情况）
                    foodItems[id].$quantityHandlers.push($(this).children('li.food-quantity'));
                }
                hideZeroQuantityFoodItem($(this));
            });
        }

        /**
         * 数量为0 隐藏减号和数量span
         * @param $foodItem
         */
        function hideZeroQuantityFoodItem($foodItem){
            var $handler = $foodItem.children("li.food-quantity");
            if(!$handler.children('span.num').html().trim()>0){
                $handler.children('span.num,span.minus').hide()
            };
        }

        function _initMusic(){
            $('#music').click(function(){
                if(opts.isPlaying){
                    $(this).removeClass("rotating").children("audio").get(0).pause();
                    opts.isPlaying = false;
                }else{
                    $(this).addClass("rotating").children("audio").get(0).play();
                    opts.isPlaying = true;
                }
            });
        }

        function _initSwipers(){
            opts.mainSwiper = new Swiper("#"+opts.mainSwiperID,_parseSwiperParam());
            opts.subSwiper = new Swiper("#"+opts.subSwiperID,{
                initialSlide:!opts.orderFinished?0:2
            });
            opts.subSwiper.lockSwipes();
        }


        function _parseSwiperParam(){
            return {
                direction: 'vertical',
                longSwipes : !opts.shortSwipe,
                shortSwipes:opts.shortSwipe,
                longSwipesMs:opts.timeThreshold,
                pagination: '.swiper-pagination',
                paginationType : 'custom',
                paginationCustomRender: function (swiper, current, total) {
                    var scaleX = current / total,scaleY = 1;
                    $("#progressCustom").transform('translate3d(0,0,0) scaleX(' + scaleX + ') scaleY(' + scaleY + ')').transition(300);
                    $("#currentFraction").text(current);
                    $("#totalFraction").text(total);
                },
                onInit:_onInit,
                onSlideChangeEnd:_onSlideChangeEnd,
                onTouchStart:_onTouchStart,
                onTouchMove:_onTouchMove,
                onTouchEnd:_onTouchEnd,
            }
        }


        function _addPrarmToSwiper(key,value){
            if(!value){
                $.extend(opts.swiperParam,key);
            }else{
                $.extend(opts.swiperParam,{key:value});
            }
        }

        function _onInit(swiper){
            swiperAnimateCache(swiper);
            swiperAnimate(swiper);
        }

        function _onSlideChangeEnd(swiper){
            swiperAnimate(swiper);
            if (swiper.activeIndex == opts.mapIndex || swiper.activeIndex == opts.menuIndex) {
                swiper.params.followFinger = false;
                if (swiper.activeIndex == opts.mapIndex && opts.showMap != null) {
                    opts.showMap();
                }
            } else {
                swiper.params.followFinger = true;
            }
        }

        function _onTouchStart(swiper,event){
            if(swiper.activeIndex==opts.menuIndex){
                $.each(opts.scrollings,function(key){
                    if($(event.target).closest("#"+key).length>0){
                        opts.scrollings.in = key;
                        return;
                    }
                });
            }
        }

        function _onTouchMove(swiper){
            if(swiper.activeIndex==opts.menuIndex&&opts.scrollings.in!=null){
                var handler = opts.scrollings[opts.scrollings.in];
                handler.$list.transform('translate3d(0px, ' +(handler.offset+swiper.touches.diff)+ 'px, 0px)');
            }
        }

        function _onTouchEnd(swiper){
            if(swiper.activeIndex==opts.menuIndex&&opts.scrollings.in!=null){
                var handler = opts.scrollings[opts.scrollings.in];
                if(handler.thresholdBottom>0){
                    //内容少于包裹div --贴向top
                    handler.offset=handler.thresholdTop;
                    handler.$list.transform('translate3d(0px,'+handler.offset+'px, 0px)');
                }else{
                    //滑动距离内容高度，滑动结束后，将内容"贴边"
                    handler.offset+=swiper.touches.diff;
                    if(handler.offset>handler.thresholdTop){
                        //向下滑头部内容低于top --贴向top
                        handler.offset=handler.thresholdTop;
                        handler.$list.transform('translate3d(0px,'+handler.offset+'px, 0px)');
                    }else if(handler.offset<handler.thresholdBottom){
                        //向上滑尾部内容高于bottom --贴向bottom
                        handler.offset = handler.thresholdBottom;
                        handler.$list.transform('translate3d(0px, ' + handler.offset + 'px, 0px)');
                    }
                }
                opts.scrollings.in = null;
            }
        }

        function _buildScrollings(){
            opts.scrollings = {
              in : null,
            };
            $.each(opts.scrollingIDs.split(","),function(index, elem){
                opts.scrollings[elem]={
                    offset:0,
                    thresholdTop:0,
                    $list:$("#"+elem).wrapInner('<div class="wrapper"/>').children('.wrapper'),
                    thresholdBottom:-$('.wrapper',"#"+elem).height()+$("#"+elem).height(),
                    in:false,
                };
            });
        }

        function _resizeScrolling($elem){
            opts.scrollings[$elem.attr('id')].thresholdBottom = -$('.wrapper',$elem).height()+$elem.height();
        }


        init();
    }

    yq.prototype = {

    }

    window.ZUI = yq;
    
})(jQuery)