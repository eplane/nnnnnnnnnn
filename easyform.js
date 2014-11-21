/*
 * 表单验证插件 easyvalidation
 * Author:LeeLanfei
 * 2014-11-5
 * 用于表单验证
 * 只要在需要验证的控件上添加validation-rules属性即可，多个属性用[;]连接
 * 属性列表：
 *      null
 *      email
 *      char-normal         英文、数字、下划线
 *      char-chinese        中文、英文、数字、下划线、中文标点符号
 *      length:1-10 / length:4
 *      equal:xxx                               等于某个对象的值，冒号后是jq选择器语法
 *      ajax:fun()
 *      real-time                               实时检查
 *      date
 *      time
 *      datetime
 *      money
 *      uint :1           正整数 , 参数为起始值
 *
 *
 *  ------ requirement list ----------------------------------------------------
 * 1. 2014-11-18 没有排除隐藏起来的input和hidden类型的input
 * 2. 2014-11-18 需要支持有条件的提示信息。
 * 3. 2014-11-19 ajax不支持异步
 * 4. 2014-11-19 没有考虑file类型等特殊类型的判断
 * 5. 2014-11-20 当网页载入时有隐藏的控件，之后控件显示出来后，其关联的easytip不能正确显示位置
 * 6. 2014-11-21 目前不支持属性继承
 * 7. 2014-11-21 实时检查的时候，弹出的easytip有时候会导致弹出信息的消息出错
 *
 *
 * ------ change list -------------------------------------------------
 * 1. 2014-11-18 requirement list 1 完成
 * 2. 2014-11-18 支持实时检查
 * 3. 2014-11-18 requirement list 2 完成
 * 4. 2014-11-20 requirement list 3支持了ajax异步验证方式。
 * 5. 2014-11-21 requirement list 5完成
 *
 * */
;
(function ($, window, document, undefined)
{
    /*
     构造函数
     **/
    var _easyvalidation = function (ele, opt)
    {
        this.form = ele;

        this.defaults = {
            easytip: true
        };
        this.options = $.extend({}, this.defaults, opt);

        this.result = [];
        this.inputs = [];

        this.counter = 0;   //已经判断成功的input计数
    };

    //方法
    _easyvalidation.prototype = {

        init: function ()
        {
            var inputs = this.inputs;
            var ei = this;
            var result = this.result;
            ei._load();

            //改写 submit 的属性，便于控制
            this.submit_button = this.form.find("input:submit");
            this.submit_button.each(function ()
            {
                var button = $(this);
                button.attr("type", "button");

                //提交前判断
                button.click(function ()
                {
                    ei._load();                                     //重新载入控件
                    result.splice(0, result.length);     //清空前一次的结果

                    counter = 0;
                    is_submit = true;

                    var index;
                    for (index in inputs)
                    {
                        inputs[index].validation();
                    }
                });
            });
        },

        _load: function ()
        {
            this.inputs.splice(0, this.inputs.length);

            var inputs = this.inputs;
            var form = this.form;
            var easytip = this.options.easytip;
            var result = this.result;
            var counter = this.counter;

            this.form.find("input:visible").each(function (index, input)
            {
                //hidden不做判断
                if (input.type != "hidden" && input.type != "button" && input.type != "submit")
                {
                    var checker = $(input).easyinput({easytip: easytip});

                    checker.error = function (e)
                    {
                        is_submit = false;
                        result.push(e);
                    };

                    checker.success = function (e)
                    {
                        counter++;
                        if (counter == inputs.length)
                        {
                            counter = 0;

                            if (is_submit)
                            {
                                form.submit();
                            }
                        }
                    };

                    inputs.push(checker);
                }
            });


            var o = 0;
        }
    };

    //添加到jquery
    $.fn.easyvalidation = function (options)
    {
        var validation = new _easyvalidation(this, options);

        return validation.init();
    };


})(jQuery, window, document);

(function ($, window, document, undefined)
{
    //单个input的检查器构造函数
    var _easyinput = function (input, opt)
    {
        this.input = input;
        this.rules = [];

        this.message = $(input).attr("message");
        this.message = (!!this.message ? this.message : "格式错误!");

        //事件
        this.error = null;
        this.success = null;

        this.defaults = {
            easytip: true   //是否显示easytip
        };
        this.options = $.extend({}, this.defaults, opt);

        this.counter = 0;   //计数器，记录已经有多少个条件成功

        this.is_error = false;
    };

    //单个input的检查器
    _easyinput.prototype = {

        init: function ()
        {
            //初始化easytip
            this._init_easytip();

            //是否实时检查
            var easyinput = this;
            var rule = this.input.attr("easyvalidation");
            if (!!rule && -1 != rule.indexOf("real-time"))
            {
                this.input.blur(function ()
                {
                    easyinput.validation();
                });
            }

            return this;
        },

        //初始化easytip
        _init_easytip: function ()
        {
            if (!!this.options.easytip)
            {
                var tipoptions = $(this.input).attr("easytip");

                tipoptions = (!!tipoptions ? tipoptions.split(";") : undefined);

                if (!!tipoptions)
                {
                    var options = Object();
                    var index;
                    for (index in tipoptions)
                    {
                        var temps = tipoptions[index];
                        var p = temps.indexOf(":");

                        if (-1 == p)continue;

                        var temp = [];
                        temp[0] = temps.substring(0, p);
                        temp[1] = temps.substring(p + 1);

                        options[temp[0]] = temp[1];
                    }
                }

                this.options.easytip = $(this.input).easytip(options);
            }
        },

        /**
         * 规则判断
         * @ajax 是否执行ajax判断
         * */
        validation: function ()
        {
            this.value = this.input.val();
            this.counter = 0;   //计数器清零
            this.rule = this.input.attr("easyvalidation");

            this.is_error = false;

            this._parse(this.rule);

            this._null(this, this.value, this.rule);

            for (var i = 0; i < this.rules.length; i++)
            {
                //调用条件函数
                if (!!this._judge[this.rules[i].rule])
                    this._judge[this.rules[i].rule](this, this.value, this.rules[i].rule, this.rules[i].param);
            }
        },

        //easyvalidation 解析函数
        _parse: function (str)
        {
            this.rules = [];

            var strs = !!str ? str.split(";") : {};

            for (var i = 0; i < strs.length; i++)
            {
                var s = strs[i];
                var rule = s;
                var param = "";

                //有：号
                var p = s.indexOf(":");
                if (-1 != p)
                {
                    rule = s.substr(0, p);
                    param = s.substr(p + 1);
                }

                if (!!this._judge[rule])
                    this.rules.push({rule: rule, param: param});
            }
        },

        _error: function (rule)
        {
            if (!!this.error)
                this.error(this.input, rule);

            if (false == this.is_error)
            {
                var msg = this.input.attr(rule + "-message");

                var msg = !msg ? this.message : msg;

                if (!!this.options.easytip)
                {
                    this.options.easytip.show(msg);
                }

                this.is_error = true;
            }

            return false;
        },

        _success: function ()
        {
            if (!!this.success)
                this.success(this.input);

            return true;
        },

        _success_rule: function (rule)
        {
            this.counter += 1;

            if (this.counter == this.rules.length)
                this._success();

            return true;
        },

        _null: function (ei, v, r)
        {
            if (!v)
            {
                if (!!r && -1 != r.indexOf("null")) //rule不为空并且含有null
                {
                    return ei._success();
                }
                else
                {
                    return ei._error("require");
                }
            }
        },

        /*
         * 按照各种rule进行判断的函数数组
         * */
        _judge: {
            "char-normal": function (ei, v, r, p)
            {
                if (false == /^\w+$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "char-chinese": function (ei, v, r, p)
            {
                //if (false == /^[\w]|[\u4e00-\u9fa5]+$/.test(v))
                if (false == /^([\w]|[\u4e00-\u9fa5]|[。，、？“‘！：【】《》（）——-])+$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "email": function (ei, v, r, p)
            {
                if (false == /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "length": function (ei, v, r, p)
            {
                var range = p.split("-");

                //如果长度设置为 length:6 这样的格式
                if (range.length == 1) range[1] = range[0];

                if (v.length < range[0] || v.length > range[1])
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "equal": function (ei, v, r, p)
            {
                var pair = $(p);
                if (0 == pair.length || pair.val() != v)
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "ajax": function (ei, v, r, p)
            {
                // 为ajax处理注册自定义事件
                // HTML中执行相关的AJAX时，需要发送事件 easyinput-ajax 来通知 easyinput
                // 该事件只有一个bool参数，easyinput 会根据这个值判断ajax验证是否成功
                ei.input.delegate("", "easyinput-ajax", function (e, p)
                {
                    ei.input.unbind("easyinput-ajax");

                    if (false == p)
                        return ei._error(r);
                    else
                        return ei._success_rule(r);
                });

                eval(p);
            },

            "date": function (ei, v, r, p)
            {
                if (false == /^(\d{4})-(\d{2})-(\d{2})$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "time": function (ei, v, r, p)
            {
                if (false == /^(\d{2}):(\d{2})$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "datetime": function (ei, v, r, p)
            {
                if (false == /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "money": function (ei, v, r, p)
            {
                if (false == /^([1-9][\d]{0,7}|0)(\.[\d]{1,2})?$/.test(v))
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            },

            "uint": function (ei, v, r, p)
            {
                v = parseInt(v);
                p = parseInt(p);

                if (isNaN(v) || isNaN(p) || v < p || v < 0)
                    return ei._error(r);
                else
                    return ei._success_rule(r);
            }
        }
    };

    $.fn.easyinput = function (options)
    {
        var check = new _easyinput(this, options);

        return check.init();
    };

})(jQuery, window, document);

(function ($, window, document, undefined)
{
    var themes = {
        black: {
            color: "rgba(238,238,238,1)",
            "background-color": "rgba(75,75,75,0.8",
            "border": "1px solid rgba(75,75,75,1)",
            "border-radius": 5
        },
        blue: {
            color: "rgba(255,255,255,1)",
            "background-color": "rgba(51,153,204,0.8)",
            "border": "1px solid rgba(102,153,204,1)",
            "border-radius": 5
        },
        red: {
            color: "rgba(255,255,255,1)",
            "background-color": "rgba(255,102,102,0.9)",
            "border": "1px solid rgba(204,0,51,1)",
            "border-radius": 5
        },
        white: {
            color: "rgba(102,102,102,1)",
            "background-color": "rgba(255,255,255,0.9)",
            "border": "1px solid rgba(153,153,153,1)",
            "border-radius": 5
        }
    };

    var _easytip = function (ele, opt)
    {
        this.parent = ele;
        this.defaults = {
            left: 0, top: 0,
            position: "right",
            disappear: "other",        //self, other, lost-focus, none, N seconds
            speed: "fast",
            theme: "white",
            arrow: "bottom",        //top, left, bottom, right
            onshow: null,
            onclose: null,
            style: {}
        };
        this.options = $.extend({}, this.defaults, opt);
        this.theme = themes[this.options.theme];

        this.padding = 0;

        this.id = "easytip-div-main" + ele[0].id;
    };

    _easytip.prototype = {

        init: function ()
        {
            var tip = $("#" + this.id);

            if (tip.length == 0)
            {
                $(document.body).append("<div id=\"" + this.id + "\"><div class=\"easytip-text\"></div></div>");

                tip = $("#" + this.id);
                var text = $("#" + this.id + " .easytip-text");

                tip.css({
                    "text-align": "left",
                    "display": "none",
                    "position": "absolute"
                });

                text.css({
                    "text-align": "left",
                    "padding": "10px",
                    "min-width": "120px"
                });

                tip.append("<div class=\"easytip-arrow\"></div>");
                var arrow = $("#" + this.id + " .easytip-arrow");
                arrow.css({
                    "padding": "0",
                    "margin": "0",
                    "width": "0",
                    "height": "0",
                    "position": "absolute",
                    "border": "10px solid"
                });
            }

            return this;
        },

        _size: function ()
        {
            var parent = this.parent;
            var tip = $("#" + this.id);


            if (tip.width() > 300)
            {
                tip.width(300);
            }
        },

        _css: function ()
        {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");

            text.css(this.theme);

            arrow.css("border-color", "transparent transparent transparent transparent");

            if (this.options.style != null && typeof(this.options.style) == "object")
            {
                text.css(this.options.style);
            }
        },

        _arrow: function ()
        {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");

            switch (this.options.arrow)
            {
                case "top":
                    arrow.css({
                        "left": "25px",
                        "top": -arrow.outerHeight(),
                        "border-bottom-color": text.css("borderTopColor")
                    });
                    break;

                case "left":
                    arrow.css({
                        "left": -arrow.outerWidth(),
                        "top": tip.innerHeight() / 2 - arrow.outerHeight() / 2,
                        "border-right-color": text.css("borderTopColor")
                    });
                    break;

                case "bottom":
                    arrow.css({
                        "left": "25px",
                        "top": tip.innerHeight(),
                        "border-top-color": text.css("borderTopColor")
                    });
                    break;

                case "right":
                    arrow.css({
                        "left": tip.outerWidth(),
                        "top": tip.innerHeight() / 2 - arrow.outerHeight() / 2,
                        "border-left-color": text.css("borderTopColor")
                    });
                    break;
            }
        },

        _position: function ()
        {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");
            var offset = $(this.parent).offset();
            var size = {width: $(this.parent).outerWidth(), height: $(this.parent).outerHeight()};

            switch (this.options.position)
            {
                case "top":

                    tip.css("left", offset.left - this.padding);
                    tip.css("top", offset.top - tip.outerHeight() - arrow.outerHeight() / 2);
                    this.options.arrow = "bottom";

                    break;

                case "left":

                    tip.css("left", offset.left - tip.outerWidth() - arrow.outerWidth() / 2);
                    tip.css("top", offset.top - (tip.outerHeight() - size.height) / 2);
                    this.options.arrow = "right";

                    break;

                case "bottom":

                    tip.css("left", offset.left - this.padding);
                    tip.css("top", offset.top + size.height + arrow.outerHeight() / 2);
                    this.options.arrow = "top";

                    break;

                case "right":

                    tip.css("left", offset.left + size.width + arrow.outerWidth() / 2);
                    tip.css("top", offset.top - (tip.outerHeight() - size.height) / 2);
                    this.options.arrow = "left";

                    break;
            }

            var left = parseInt(tip.css("left"));
            var top = parseInt(tip.css("top"));

            tip.css("left", parseInt(this.options.left) + left);
            tip.css("top", parseInt(this.options.top) + top);
        },

        show: function (msg)
        {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");
            var speed = this.options.speed;
            var disappear = this.options.disappear;
            var parent = this.parent;

            text.html(msg);

            this._size();
            this._css();
            this._position();
            this._arrow();

            var onshow = this.options.onshow;
            var onclose = this.options.onclose;

            tip.fadeIn(speed, function ()
            {
                if (!!onshow)    onshow({parent: parent, target: tip[0]});

                if (!isNaN(disappear))
                {
                    setTimeout(function ()
                    {

                        tip.fadeOut(speed, function ()
                        {
                            if (!!onclose)    onclose({parent: parent, target: tip[0]});
                        });

                    }, disappear);
                }
                else if (disappear == "self" || disappear == "other")
                {
                    $(document).click(function (e)
                    {
                        if (disappear == "self" && e.target == text[0])
                        {
                            tip.fadeOut(speed, function ()
                            {
                                if (!!onclose)    onclose({parent: parent, target: tip[0]});
                                $(document).unbind("click");
                            });
                        }
                        else if (disappear == "other" && e.target != tip[0])
                        {
                            tip.fadeOut(speed, function ()
                            {
                                if (!!onclose)    onclose({parent: parent, target: tip[0]});
                                $(document).unbind("click");
                            });
                        }
                    });
                }
                else if (disappear == "lost-focus")
                {
                    $(parent).focusout(function ()
                    {
                        tip.fadeOut(speed, function ()
                        {
                            if (!!onclose)    onclose({parent: parent, target: tip[0]});
                            $(parent).unbind("focusout");
                        });
                    });
                }
            });
        },

        close: function ()
        {
            var tip = $("#" + this.id);
            var parent = this.parent;
            var onclose = this.options.onclose;

            tip.fadeOut(this.options.speed, function ()
            {
                if (!!onclose)    onclose({parent: parent, target: tip[0]});
            });
        }
    };

    $.fn.easytip = function (options)
    {
        var tip = new _easytip(this, options);

        return tip.init();
    };

})(jQuery, window, document);