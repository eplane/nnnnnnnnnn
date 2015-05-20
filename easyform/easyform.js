/*
 * 表单验证插件 easyform
 * Author : 李兰非
 * 2014-11-5
 * 用于表单验证
 * 只要在需要验证的控件上添加easyform属性即可，多个属性用[;]连接
 * 属性列表：
 *      null
 *      email
 *      char-normal         英文、数字、下划线
 *      char-chinese        中文、英文、数字、下划线、中文标点符号
 *      char-english        英文、数字、下划线、英文标点符号
 *      length:1 10 / length:4      能够识别汉字等宽字符长度
 *      equal:xxx                               等于某个对象的值，冒号后是jq选择器语法
 *      ajax:fun()
 *      real-time                               实时检查
 *      date                    2014-10-31
 *      time                    10:30:00
 *      datetime            2014-10-31 10:30:00
 *      money               正数，两位小数
 *      uint :1 100                 正整数 , 参数为起始值和最大值
 *      number              不限长度的数字字符串
 *      float:7 2
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
 * 8. 2015-4-10 input没有easyform属性时，不提交表单
 * 9. 需要添加一些事件，包括 提交、验证
 *
 *
 * ------ change list -------------------------------------------------
 * 1. 2014-11-18 requirement list 1 完成
 * 2. 2014-11-18 支持实时检查
 * 3. 2014-11-18 requirement list 2 完成
 * 4. 2014-11-20 requirement list 3支持了ajax异步验证方式。
 * 5. 2014-11-21 requirement list 5完成
 * 6. 2015-4-12 requirement list 8完成
 * 7. 2015-5-11 正确识别汉字长度
 *
 * ------ DEMO  -------------------------------------------------
 * <input type="text" id="demo"  easyform="length:4 16;number;" message-number="必须是数字" message-length="长度错误">
 * */
;

function aaa()
{

}

//easyform
(function ($, window, document, undefined) {
    /*
     构造函数
     **/
    var _easyform = function (ele, opt) {
        this.form = ele;

        if (0 == this.form.length && "form" != this.form[0].localName) {
            throw new Error("easyform need a form !");
        }

        this.defaults = {
            easytip: true   //是否显示easytip，可以关闭后，使用自定义的提示信息
        };

        this.options = $.extend({}, this.defaults, opt);

        this.result = [];
        this.inputs = [];

        this.counter = 0;   //已经判断成功的input计数
        this.is_submit = true;  //是否提交，如果为false，即使验证成功也不会执行提交

        //事件定义
        this.success = null;
        this.error = null;
        this.per_validation = null;     //在所有验证之前执行
    };

    //方法
    _easyform.prototype = {

        init: function () {
            var ei = this;
            ei._load();

            //改写 submit 的属性，便于控制
            this.submit_button = this.form.find("input:submit");
            this.submit_button.each(function () {
                var button = $(this);
                button.attr("type", "button");

                //提交前判断
                button.click(function () {
                    ei.submit(true);
                });
            });

            return this;
        },

        _load: function () {
            this.inputs.splice(0, this.inputs.length);
            var ev = this;

            this.form.find("input:visible").each(function (index, input) {
                //排除 hidden、button、submit、checkbox、radio、file
                if (input.type != "hidden" && input.type != "button" && input.type != "submit" && input.type != "checkbox" && input.type != "radio" && input.type != "file") {
                    var checker = $(input).easyinput({easytip: ev.easytip});

                    checker.error = function (e) {
                        ev.is_submit = false;
                        ev.result.push(e);

                        if (!!ev.error)    //失败事件
                            ev.error(e);
                    };

                    checker.success = function (e) {
                        ev.counter++;
                        if (ev.counter == ev.inputs.length) {
                            ev.counter = 0;

                            if (!!ev.success)    //成功事件
                                ev.success();

                            if (!!ev.is_submit) {
                                ev.form.submit();
                            }
                        }
                    };

                    ev.inputs.push(checker);
                }
            });
        },

        /*
         * 表单提交函数
         * @submit：bool值，用于定义是否真的提交表单
         * */
        submit: function (submit) {
            this._load();                                               //重新载入控件
            this.result.splice(0, this.result.length);     //清空前一次的结果

            this.counter = 0;
            this.is_submit = submit;

            //如果没有需要判断的控件
            if (this.inputs.length == 0) {
                if (!!this.success)    //成功事件
                    this.success();

                if (this.is_submit)
                    this.form.submit();
            }

            //执行per_validation事件
            if (this.per_validation) {
                this.is_submit = this.per_validation();
            }

            var index;
            for (index in this.inputs) {
                this.inputs[index].validation();
            }
        }

    };

    //添加到jquery
    $.fn.easyform = function (options) {
        var validation = new _easyform(this, options);

        return validation.init();
    };


})(jQuery, window, document);

//easyinput
(function ($, window, document, undefined) {
    //单个input的检查器构造函数
    var _easyinput = function (input, opt) {
        this.input = input;

        if (0 == this.input.length && "input" != this.input[0].localName) {
            throw new Error("easyform need a input object !");
        }

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

        init: function () {
            //初始化easytip
            this._init_easytip();

            //是否实时检查
            var easyinput = this;
            var rule = this.input.attr("easyform");
            if (!!rule && -1 != rule.indexOf("real-time")) {
                this.input.blur(function () {
                    easyinput.validation();
                });
            }

            return this;
        },

        //初始化easytip
        _init_easytip: function () {
            if (!!this.options.easytip) {
                this.options.easytip = $(this.input).easytip();
            }
        },

        /**
         * 规则判断
         * */
        validation: function () {
            this.value = this.input.val();
            this.counter = 0;   //计数器清零
            this.rule = this.input.attr("easyform");

            this.is_error = false;

            this._parse(this.rule);

            if (false == this._null(this, this.value, this.rule)) {
                for (var i = 0; i < this.rules.length; i++) {
                    //调用条件函数
                    if (!!this.judge[this.rules[i].rule])
                        this.judge[this.rules[i].rule](this, this.value, this.rules[i].param);
                }

                //如果没有写任何规则
                if (this.rules.length == 0) {
                    this._success();
                }
            }
        },

        //easyform 解析函数
        _parse: function (str) {
            this.rules = [];

            var strs = !!str ? str.split(";") : {};

            for (var i = 0; i < strs.length; i++) {
                var s = strs[i];
                var rule = s;
                var param = "";

                //有：号
                var p = s.indexOf(":");
                if (-1 != p) {
                    rule = s.substr(0, p);
                    param = s.substr(p + 1);
                }

                if (!!this.judge[rule])
                    this.rules.push({rule: rule, param: param});
            }
        },

        _error: function (rule) {
            if (!!this.error)
                this.error(this.input, rule);

            if (false == this.is_error) {
                var msg = this.input.attr("message-" + rule);

                msg = !msg ? this.message : msg;

                if (!!this.options.easytip) {
                    this.options.easytip.show(msg);
                }

                this.is_error = true;
            }

            return false;
        },

        _success: function () {
            if (!!this.success)
                this.success(this.input);

            return true;
        },

        _success_rule: function (rule) {
            this.counter += 1;

            if (this.counter == this.rules.length)
                this._success();

            return true;
        },

        _null: function (ei, v, r) {
            if (!v) {
                if (!!r && -1 != r.indexOf("null")) //rule不为空并且含有null
                {
                    return ei._success();
                }
                else {
                    return ei._error("null");
                }
            }
            else {
                return false;
            }
        },

        /*
         * 按照各种rule进行判断的函数数组
         * 通过对judge添加成员函数，可以扩充规则
         * */
        judge: {
            "char-normal": function (ei, v, p) {
                if (false == /^\w+$/.test(v))
                    return ei._error("char-normal");
                else
                    return ei._success_rule("char-normal");
            },

            "char-chinese": function (ei, v, p) {
                if (false == /^([\w]|[\u4e00-\u9fa5]|[ 。，、？￥“‘！：【】《》（）——+-])+$/.test(v))
                    return ei._error("char-chinese");
                else
                    return ei._success_rule("char-chinese");
            },

            "char-english": function (ei, v, p) {
                if (false == /^([\w]|[ .,?!$'":+-])+$/.test(v))
                    return ei._error("char-english");
                else
                    return ei._success_rule("char-english");
            },

            "email": function (ei, v, p) {
                if (false == /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(v))
                    return ei._error("email");
                else
                    return ei._success_rule("email");
            },

            "length": function (ei, v, p) {
                var range = p.split(" ");

                //如果长度设置为 length:6 这样的格式
                if (range.length == 1) range[1] = range[0];

                var len = v.replace(/[^\x00-\xff]/g, "aa").length;

                if (len < range[0] || len > range[1])
                    return ei._error("length");
                else
                    return ei._success_rule("length");
            },

            "equal": function (ei, v, p) {
                var pair = $(p);
                if (0 == pair.length || pair.val() != v)
                    return ei._error("equal");
                else
                    return ei._success_rule("equal");
            },

            "ajax": function (ei, v, p) {
                // 为ajax处理注册自定义事件
                // HTML中执行相关的AJAX时，需要发送事件 easyinput-ajax 来通知 easyinput
                // 该事件只有一个bool参数，easyinput 会根据这个值判断ajax验证是否成功
                ei.input.delegate("", "easyinput-ajax", function (e, p) {
                    ei.input.unbind("easyinput-ajax");

                    if (false == p)
                        return ei._error("ajax");
                    else
                        return ei._success_rule("ajax");
                });

                eval(p);
            },

            "date": function (ei, v, p) {
                if (false == /^(\d{4})-(\d{2})-(\d{2})$/.test(v))
                    return ei._error("date");
                else
                    return ei._success_rule("date");
            },

            "time": function (ei, v, p) {
                if (false == /^(\d{2}):(\d{2}):(\d{2})$/.test(v))
                    return ei._error("time");
                else
                    return ei._success_rule(v);
            },

            "datetime": function (ei, v, p) {
                if (false == /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.test(v))
                    return ei._error("datetime");
                else
                    return ei._success_rule("datetime");
            },

            "money": function (ei, v, p) {
                if (false == /^([1-9][\d]{0,7}|0)(\.[\d]{1,2})?$/.test(v))
                    return ei._error("money");
                else
                    return ei._success_rule("money");
            },

            "number": function (ei, v, p) {
                if (false == /^\d{1,}$/.test(v))
                    return ei._error("number");
                else
                    return ei._success_rule("number");
            },

            "float": function (ei, v, p) {
                var range = p.split(" ");

                //如果长度设置为 length:6 这样的格式
                //必须定义整数和小数的位数
                if (range.length != 2)
                    return ei._error("float");

                var pattern = new RegExp("^([1-9][\\d]{0," + range[0] + "}|0)(\\.[\\d]{1," + range[1] + "})?$");

                if (false == pattern.test(v))
                    return ei._error("float");

                else
                    return ei._success_rule("float");
            },

            "uint": function (ei, v, p) {
                v = parseInt(v);

                var range = p.split(" ");

                if (range.length == 1) {
                    range[1] = 99999999999999;
                }

                range[0] = parseInt(range[0]);
                range[1] = parseInt(range[1]);

                if (isNaN(v) || isNaN(range[0]) || isNaN(range[1]) || v < range[0] || v > range[1] || v < 0)
                    return ei._error("uint");
                else
                    return ei._success_rule("uint");
            }
        }
    };

    $.fn.easyinput = function (options) {
        var check = new _easyinput(this, options);

        return check.init();
    };

})(jQuery, window, document);

//easytip
(function ($, window, document, undefined) {

    var _easytip = function (ele, opt) {
        this.parent = ele;

        if (0 == this.parent.length) {
            throw new Error("easytip's is null !");
        }

        this.defaults = {
            left: 0, top: 0,
            position: "right",           //top, left, bottom, right
            disappear: "other",       //self, other, lost-focus, none, N seconds
            speed: "fast",
            theme: "easy-white",
            arrow: "bottom",          //top, left, bottom, right 自动，手动配置无效
            onshow: null,               //事件
            onclose: null,               //事件
            style: {}
        };

        aaa();

        //从控件的 data-easytip中读取配置信息
        var data = this._load_data();

        this.options = $.extend({}, this.defaults, opt, data);

        this.padding = 100;

        this.id = "easytip-div-main" + ele[0].id;
    };

    _easytip.prototype = {

        init: function () {
            var tip = $("#" + this.id);

            //同一个控件不会多次初始化。
            if (tip.length == 0) {
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

        //初始化easytip
        _load_data: function () {

            var tipoptions = $(this.parent).data("easytip");

            tipoptions = (!!tipoptions ? tipoptions.split(";") : undefined);

            if (!!tipoptions) {
                var options = Object();
                var index;
                for (index in tipoptions) {
                    var temps = tipoptions[index];
                    var p = temps.indexOf(":");

                    if (-1 == p)continue;

                    var temp = [];
                    temp[0] = temps.substring(0, p);
                    temp[1] = temps.substring(p + 1);

                    options[temp[0]] = temp[1];
                }
            }

            return options;
        },

        _size: function () {
            var parent = this.parent;
            var tip = $("#" + this.id);

            if (tip.width() > 300) {
                tip.width(300);
            }
        },

        _css: function () {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");

            text.addClass(this.options.theme);

            arrow.css("border-color", "transparent transparent transparent transparent");
            tip.css("box-sizing", "content-box");

            if (this.options.style != null && typeof(this.options.style) == "object") {
                text.css(this.options.style);
            }
        },

        _arrow: function () {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");

            switch (this.options.arrow) {
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

        _position: function () {
            var tip = $("#" + this.id);
            var text = $("#" + this.id + " .easytip-text");
            var arrow = $("#" + this.id + " .easytip-arrow");
            var offset = $(this.parent).offset();
            var size = {width: $(this.parent).outerWidth(), height: $(this.parent).outerHeight()};

            switch (this.options.position) {
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

        show: function (msg) {
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

            tip.fadeIn(speed, function () {
                if (!!onshow)    onshow({parent: parent, target: tip[0]});

                if (!isNaN(disappear)) {
                    setTimeout(function () {

                        tip.fadeOut(speed, function () {
                            if (!!onclose)    onclose({parent: parent, target: tip[0]});
                        });

                    }, disappear);
                }
                else if (disappear == "self" || disappear == "other") {
                    $(document).click(function (e) {
                        if (disappear == "self" && e.target == text[0]) {
                            tip.fadeOut(speed, function () {
                                if (!!onclose)    onclose({parent: parent, target: tip[0]});
                                $(document).unbind("click");
                            });
                        }
                        else if (disappear == "other" && e.target != tip[0]) {
                            tip.fadeOut(speed, function () {
                                if (!!onclose)    onclose({parent: parent, target: tip[0]});
                                $(document).unbind("click");
                            });
                        }
                    });
                }
                else if (disappear == "lost-focus") {
                    $(parent).focusout(function () {
                        tip.fadeOut(speed, function () {
                            if (!!onclose)    onclose({parent: parent, target: tip[0]});
                            $(parent).unbind("focusout");
                        });
                    });
                }
            });
        },

        close: function () {
            var tip = $("#" + this.id);
            var parent = this.parent;
            var onclose = this.options.onclose;

            tip.fadeOut(this.options.speed, function () {
                if (!!onclose)    onclose({parent: parent, target: tip[0]});
            });
        }
    };

    $.fn.easytip = function (options) {
        var tip = new _easytip(this, options);

        return tip.init();
    };

})(jQuery, window, document);

//easyimagefile 图片文件上传
//TODO 替换内容的方式有问题，应该换成更好的html
//TODO 不能缓存提交一个默认值，在修改内容的时候，不能保持过去的值
//TODO 默认空白图片不对，可以考虑不使用img控件
(function ($, window, document, undefined) {
    var _easyimagefile = function (input, opt) {
        this.input = input;
        this.id = input.attr('id');

        this.fileid = this.id + "-file";
        this.imgid = this.id + "-img";
        this.tipid = this.id + "-tip";
        this.delid = this.id + "-del";

        this.last_file = null;

        this.defaults = {
            "default": "http://localhost/wz/admin/resource/js/plugins/easyform/none.png"
        };

        this.options = $.extend({}, this.defaults, opt);
    };

    _easyimagefile.prototype = {

        init: function () {
            var style = this.input.attr('style');
            var $this = this;
            var src = this.input.attr('src');

            if (!src || src.length == 0) {
                src = $this.options.default;
            }


            var sclass = this.input.attr('class');

            var tip_text = this.input.attr('title');

            if (!tip_text) tip_text = "";

            this.input.css("position", "relative");

            var x = this.input.position().left;
            var y = this.input.position().top;
            var w = this.input.outerWidth();
            var h = this.input.outerHeight();

            var file = "<input type='file' name='" + $this.fileid + "'  id='" + $this.fileid + "' style='display:none;'>";
            var img = "<img src='" + src + "' name='" + $this.imgid + "'  id='" + $this.imgid + "' style='" + style + ";cursor:pointer;' class='" + sclass + "'>";
            var tip = "<div id='" + $this.tipid + "' style='display:none; position:absolute;top:" + y + "px;left:" + x + "px;width:" + w + "px;height:" + h + "px;background-color:#000;text-align:center;cursor:pointer;-moz-opacity: 0.6; opacity:0.6; filter: alpha(opacity=60);color:#fff;padding-top:20%;'>" + tip_text +
                "<div id='" + $this.delid + "' style='position:absolute;top:5px;right:5px;display:block;' class='easyform-close'></div>" +
                "</div>";

            this.input.replaceWith(file + img + tip);

            var imgobj = $("#" + $this.imgid);
            var fileobj = $("#" + $this.fileid);

            var disabled = this.input.attr('disabled');

            if (!disabled) {
                imgobj.click(function () {
                    fileobj.click();
                });

                $("#" + $this.imgid + ", #" + $this.tipid).hover(function (e) {
                    $("#" + $this.tipid).show();
                }, function (e) {
                    $("#" + $this.tipid).hide();
                });

                $("#" + $this.tipid).click(function () {
                    fileobj.click();
                });

                $("#" + $this.delid).click(function (e) {
                    e.stopPropagation();
                    imgobj.attr("src", $this.options.default);
                    fileobj.val("");    //TODO 删除已选择的文件，未经测试。
                });

                $("#" + $this.fileid).change(function () {
                    $this._onchange();
                });
            }

            return this;
        },

        _onchange: function () {
            var file = $("#" + this.fileid)[0];
            var img_file = "";
            var imgobj = $("#" + this.imgid);

            this.last_file = imgobj.attr("src");

            if (file.files && file.files[0])        //Firefox 下获取图片本地路径
            {
                img_file = window.URL.createObjectURL(file.files[0]);
                imgobj.attr("src", img_file);
            }
            else    //IE 下获取图片本地路径
            {
                file.select();

                img_file = document.selection.createRange().text;

                try {
                    imgobj[0].style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod=scale)";
                    imgobj[0].filters.item("DXImageTransform.Microsoft.AlphaImageLoader").src = img_file;
                }
                catch (e) {
                    alert("The file is not image! Please change another one!");
                    return false;
                }

                document.selection.empty();
            }

            var onchange = this.input.attr("onchange");

            if (!!onchange) {
                eval(onchange);
            }
        },

        reset: function () {
            var old = this.fileid;

            var file = "<input type='file' name='" + this.fileid + "'  id='" + this.fileid + "' style='display:none;' >";

            $("#" + old).replaceWith(file);

            var $this = this;

            $("#" + this.fileid).change(function () {
                $this._onchange();
            });
        },

        val: function () {
            return $("#" + this.fileid).val();
        }
    };

    $.fn.easyimagefile = function (options) {

        var eif = new _easyimagefile(this, options);

        return eif.init();
    };

})(jQuery, window, document);