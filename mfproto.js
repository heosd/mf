/**
 * Created by Administrator on 2015-04-13.
 */

var MF_CONST = {
	attrPrefix: "mf",
	attrCondition: 'condition',
	attrCheck: 'check',
	bracketS: '\\{\\{',
	bracketE: '\\}\\}',

	KEY_LOADING: 'loading',
	KEY_NO_ITEM: 'zeroItem',
	KEY_ERROR: 'error',

	ATTR_DATA_SOURCE: 'data-source',
	ATTR_TEMPLATE: 'template',
	ATTR_SOURCE: 'source',
	ATTR_OPTION_CLEAR: 'clear',
	ATTR_OPTION_FUNCTION: 'function',
	ATTR_OPTION_VALUE_STR: 'value-str',
	ATTR_OPTION_URL: 'url',
	ATTR_OPTION_CALLBACK: 'callback',
	ATTR_OPTION_CHAIN_ACTION: 'chain-action',

	AJAX_TYPE: 'get',
	AJAX_DATA_TYPE: 'json',

	ATTR_CHECK: 'check'
};

// -- Extend JQuery function to get data attribute, to put 'data-' or whatever later
$.fn.MF_GetDataAttr = function(attrName) {
	return this.attr(MF_CONST.attrPrefix + '-' + attrName);
};

$.fn.MF_RemoveDataAttr = function(attrName) {
	this.removeAttr(MF_CONST.attrPrefix + '-' + attrName);
};

// -- IE 8 compatible, Object.create
if (!Object.create) {
	Object.create = function(o, properties) {
		if (typeof o !== 'object' && typeof o !== 'function') throw new TypeError('Object prototype may only be an Object: ' + o);
		else if (o === null) throw new Error("This browser's implementation of Object.create is a shim and doesn't support 'null' as the first argument.");

		if (typeof properties != 'undefined') throw new Error("This browser's implementation of Object.create is a shim and doesn't support a second argument.");

		function F() {}

		F.prototype = o;

		return new F();
	};
}

var MF_CombineManager = function(startBracket, endBracket) {
	// -- Expression is regex /{{([ string, number, . ' " [ ] + - # ( ) \s @ = : ? ]+)}}/gm, only those item can be parsed
	//this.exp = new RegExp(startBracket + '\\s*([\\w\\d\\.\\"\\\'\\[\\]\\+\\-#\\(\\)\\s@=:\\?])+\\s*' + endBracket, 'gm');
	// -- Changed it to include all character except endBracket 2015/04/19
	this.exp = new RegExp(startBracket + '\\s*([^' + endBracket + ']*)+\\s*' + endBracket, 'gm');
	this.expS = new RegExp(startBracket + '\\s*');
	this.expE = new RegExp('\\s*' + endBracket);
	this.expAttr = new RegExp("\\s*" + MF_CONST.attrPrefix +  "-([^\\s]+)\\s*=\"([^\"]+)\"", 'gm');
	console.log(this.expAttr);
};

MF_CombineManager.prototype = {
	listCustomAttr: [
		{
			attr: MF_CONST.ATTR_CHECK,
			evaluateFunction: function(cond, key, value, json, myIndex, innderFuction) {
				var result = eval(cond);
				if(true === result)
					return ' checked="checked"';
				return '';
			}
		}
	],

	/**
	 * Create combine list from template string and the expression
	 * can return [] if not necessary
	 * item { bracketStr: "{{ value.name }}", evaluateStr : "value.name" or evaluateFunction: function(remain, key, value, json, myIndex, innerFunction), attrRemain: string}
	 * 1. replace(bracketStr, eval(evaluateStr)
	 * 2. replace(bracketStr, evaluateFunction(...))
	 *      where evaluateFunction will return the "String"
	 **/
	createCombineList: function(templateStr) {
		this.exp.lastIndex = 0;
		var templateStrEgg = templateStr.match(this.exp);
		//			console.info("- Grabbing the egg from " + templateStr);
		//			console.log(templateStrEgg);

		var arrResult = [];

		if(templateStrEgg) {
			for (var i = 0; i < templateStrEgg.length; i++) {
				var bracketStr = templateStrEgg[i];
				this.expS.lastIndex = 0;
				this.expE.lastIndex = 0;
				var evaluateStr = bracketStr.replace(this.expS, '').replace(this.expE, '');
				var resultItem = {
					bracketStr: bracketStr,
					evaluateStr: evaluateStr
				};
				arrResult.push(resultItem);
			}
		}

		// -- Doing with custom attribute
		this.expAttr.lastIndex = 0;
		var templateCustomEgg = templateStr.match(this.expAttr);
		//console.info("Input");
		//console.log(templateCustomEgg);
		if(templateCustomEgg && 0 < templateCustomEgg.length) {
			for(var i = 0; i < templateCustomEgg.length; i++) {
				var resultItem = MF_CombineManager.prototype.createCustomAttribute.call(this, templateCustomEgg[i]);
				if(!resultItem)
					continue;

				arrResult.push(resultItem);
			}
		}

		//			console.log(arrResult);

		return arrResult;
	},

	/**
	 * Creating custom attribute condition
	 * check the listCustomAttr.attr with 'check', call the function evaluateFunction with attrRemain and get the result String, to be combined at combineValue
	 * RegExp object should be reset with lastIndex = 0 otherwise it will not result the same. so if you have problem with different result, just create new RegExp object
	 * attrRemain can be used differently for each function, they should take care of them as well
	 * @param attrString : mf-check="value=='abcd'"
	 * @returns { bracketStr: ' mf-check="value=='abcd'", evaluateFunction: function(attrRemain, ,,,), attrRemain: 'value=='abcd' }
	 */
	createCustomAttribute: function(attrString) {
		// -- Split the attribute and remain
		this.expAttr.lastIndex = 0;
		var attrSeparate = this.expAttr.exec(attrString);

		if(!attrSeparate || 3 != attrSeparate.length) {
			return false;
		}

		var attrName = attrSeparate[1];
		var attrRemain = attrSeparate[2];

		for(var i = 0; i < MF_CombineManager.prototype.listCustomAttr.length; i++) {
			var itemAttr = MF_CombineManager.prototype.listCustomAttr[i];
			if(itemAttr.attr == attrName) {
				var result = {
					bracketStr: attrString,
					evaluateFunction: itemAttr.evaluateFunction,
					attrRemain: attrRemain
				};

				return result;
			}
		}

		console.info(attrSeparate + " uncaught, check you spell");
		return false;
	},

	/**
	 * Combine htmlStr with combineList {{ }} -> with value
	 * can call a function and inner function
	 * @param htmlStr plain text like <tag>{{ value.name }}</tag>
	 * @param combineList [] result from createCombineList
	 * @param value value to evaluate the value
	 * @returns resultHtmlStr
	 */
	combineValue: function(htmlStr, combineList, key, value, json, myIndex, innerFunction) {
		var copiedHtml = htmlStr;
		for(var i in combineList) {
			var combine = combineList[i];
			var evaluateResult = 0;

			if(combine.evaluateStr) {
				// -- Evaluate string starts with @ is inner call, which can use key value dataSource as well
				// -- TODO in evaluate function you can not use innerFunction right now, if you want to make it works, just replace @FuncABCD -> innerFunction['FuncABCD'] and evaluate it!!
				if ('@' == combine.evaluateStr[0]) {
					// -- Create string to call innerFunction innerFunction['innerTest1'](arg,arg)
					var evaluateCallStr = 'innerFunction[\'' + combine.evaluateStr.substr(1).replace(/\(/, '\'](');
					evaluateResult = eval(evaluateCallStr);
					// -- If you have problem here check the string and innerFunction name!
				} else {
					evaluateResult = eval(combine.evaluateStr);
				}
			} else if(combine.evaluateFunction) {
				evaluateResult = combine.evaluateFunction(combine.attrRemain, key, value, json, myIndex, innerFunction);
			}
			copiedHtml = copiedHtml.replace(combine.bracketStr, evaluateResult);
		}
		return copiedHtml;
	}
};

var _globalCombinerManager = new MF_CombineManager(MF_CONST.bracketS, MF_CONST.bracketE);
var getGlobalCombineManager = function() {
	return _globalCombinerManager;
};

var MF_TemplateManager = function(objCombineManager) {
	this.template = 0;
	this.templateType = MF_TemplateManager.TYPE_INVALID;
	this.resultCache = 0;

	this.combine = objCombineManager;

	if(!this.combine)
		this.combine = getGlobalCombineManager();

	if(!this.combine)
		this.combine = new MF_CombineManager(MF_CONST.bracketS, MF_CONST.bracketE);

	this.attrCondition = MF_CONST.attrCondition;
};

/**
 * Small bug can be exist
 * changed to use template can have 'PLURAL' so default(no mf-condition exist) is different from always true('mfcondition=true')
 * no mf-condition : only activated when theres no template matched! (but it can have plural default template)
 * mf-condition : default for all the time!!!! other condition can be coupled with this!!
 */
MF_TemplateManager.prototype = {
	// -- Const
	TYPE_INVALID: 1,
	TYPE_STRING: 2,
	TYPE_JQOBJECT: 3,
	TYPE_FUNCTION: 4,

	// -- Methods
	init: function(objCombineManager, attrCondition) {
		this.template = 0;
		this.templateType = MF_TemplateManager.TYPE_INVALID;
		this.resultCache = 0;

		if(objCombineManager)
			this.combine = objCombineManager;
		if(attrCondition)
			this.attrCondition = attrCondition;
	},

	setTemplate: function(template) {
		if(0 == template || !template) {
			console.error("setTemplate : Invalid template type");
			return false;
		}

		this.template = template;
		var type = typeof template;

		if('string' == type)
			this.templateType = MF_TemplateManager.prototype.TYPE_STRING;
		else if('object' == type)
			this.templateType = MF_TemplateManager.prototype.TYPE_JQOBJECT;
		else if('function' == type)
			this.templateType = MF_TemplateManager.prototype.TYPE_FUNCTION;

		MF_TemplateManager.prototype._cacheTemplate.call(this);
	},

	/**
	 * can return object { condition, template, combineList } or just Plain text
	 * @param key
	 * @param value
	 * @param json
	 * @param myIndex
	 * @returns {*}
	 */
	findTemplate: function(key, value, json, myIndex) {
		var type = this.templateType;

		if(MF_TemplateManager.prototype.TYPE_INVALID == type) {
			return false;
		}

		// -- Here's delayed template adjusting, since function can not be pre cached, do it right now!
		if(MF_TemplateManager.prototype.TYPE_FUNCTION == type) {
			var foundTemplate = this.template(key, value, json, myIndex);
			this.resultCache = MF_TemplateManager.prototype._cacheTemplateString.call(this, foundTemplate);
		}

		if(this.resultCache) {
			return MF_TemplateManager.prototype._findTemplateChild.call(this, key, value, json, myIndex);
		}

		console.error("unexpected routine executed. function type couldn't get the cached data(just now) or Object or string couldn't do it when it initialize");
		return false;
	},

	_cacheTemplate: function() {
		var type = this.templateType;
		if(MF_TemplateManager.prototype.TYPE_JQOBJECT == type)
			this.resultCache = MF_TemplateManager.prototype._cacheTemplateChild.call(this, this.template);
		else if(MF_TemplateManager.prototype.TYPE_STRING == type)
			this.resultCache = MF_TemplateManager.prototype._cacheTemplateString.call(this, this.template);
	},

	_cacheTemplateChild: function(JQTemplate) {
		var self = this;
		var arrResult = [];

		JQTemplate.children().each(function() {
			/**
			 *  this is the basic form of the template child to cache
			 *  condition : string - expression to evaluate the condition, true, 1 == key
			 *  template : string - whole string to be attached
			 *  combineList : array - bracketStr, evaluateStr, refer 'createCombineList'
			 **/
			var templateChild = { condition: '', template: '', combineList: []};
			var me = $(this.outerHTML); // -- Copy the html string and make it jquery obj

			// -- Grab out the condition, if not exist its the default, usually it should placed at the end of the list, b/c I check it with sequence
			var condition = me.MF_GetDataAttr(self.attrCondition);
			if(!condition)
				condition = true;

			// -- Copy the obj, clear the 'mf-condition' and stringify
			var template = me;
			template.MF_RemoveDataAttr(self.attrCondition);
			template = template[0].outerHTML;

			templateChild.condition = condition;
			templateChild.template = template;
			templateChild.combineList = self.combine.createCombineList(template);
			arrResult.push(templateChild);
		});
		console.info("- listTemplateChild, total " + arrResult.length );
		console.log(arrResult);

		return arrResult;
	},

	_cacheTemplateString: function(htmlString) {
		var self = this;
		var template = {
			condition: true,
			template: htmlString,
			combineList: self.combine.createCombineList(htmlString)
		};

		// -- returning with array type
		return [ template ];
	},

	/**
	 * check the condition with current item and returns the "template obj" if matched
	 * default : 0 index template
	 * keyword 'key', 'value', 'json' can be used at condition expression
	 **/
	_findTemplateChild: function(key, value, json, myIndex) {
		if(!this.resultCache) {
			console.error("_findTemplateChild failure, resultCache is empty");
			return false;
		}

		if(0 == this.resultCache.length) {
			console.error("_findTemplateChild failure, no cached template, check your template setting");
			return false;
		}

		var arrResult = [];
		var arrResultDefault = [];

		for(var i = 0; i < this.resultCache.length; i++) {
			var templateChild = this.resultCache[i];
			// -- treat Default Template in different way
			if(true === templateChild.condition) {
				arrResultDefault.push(templateChild);
				continue;
			}

			var conditionResult = eval(templateChild.condition); // -- This will use key and value
			if(true == conditionResult) {
				arrResult.push(templateChild);
			}
		}

		if(0 < arrResult.length)
			return arrResult;

		if(0 < arrResultDefault.length)
			return arrResultDefault;

		// -- Default the first one, logically this never happens!
		console.error("An error with your default condition statement, no default situation should never happens! check your condition attribute check statement");
		return this.resultCache[0];
	}
};

var MF_BindData = function() {
	this.combine = getGlobalCombineManager();
	if(!this.combine)
		this.combine = new MF_CombineManager(MF_CONST.bracketS, MF_CONST.bracketE);

	this.JQDest = 0;
	this.dataSource = 0;
	this.strValue = 0;
	this.template = new MF_TemplateManager(this.combine);
	this.clear = true;
	this.innerFunc = {};

	console.log("Bind is created");
};

MF_BindData.prototype = {
	init: function() {
		this.JQDest = 0;
		this.dataSource = 0;
		this.strValue = 0;
		this.template = this.template.init();
		this.clear = true;
	},

	setDest: function(JQDest) {
		if(!JQDest instanceof jQuery) {
			console.error("setDest : Invalid JQDest, it should be jQuery object");
			return false;
		}
		this.JQDest = JQDest;
	},

	setDataSource: function(valueOrList) {
		this.dataSource = valueOrList;
	},

	setValueStr: function(valueStr) {
		this.strValue = valueStr;
	},

	setTemplate: function(templateJQorStrorFunc) {
		this.template.setTemplate(templateJQorStrorFunc);
	},

	setClear: function(clear) {
		this.clear = clear;
	},
	addInnerFunc: function(innerFunc) {
		// -- Merge it
		$.extend(true, this.innerFunc, innerFunc);
	},

	// -- Getter
	getJQDest: function() {
		return this.JQDest;
	},

	getDataSource: function() {
		return this.dataSource;
	},

	getStrValue: function() {
		return this.strValue;
	},

	getInnerFunc: function() {
		return this.innerFunc;
	},

	getDataSourceParsed: function() {
		var json = this.dataSource;
		var valueStr = MF_BindData.prototype.getStrValue.call(this);
		if(valueStr) {
			json = eval(valueStr);
		}

		return json;
	},

	/**
	 *
	 * @param cbWithData callback(key, value, json, myIndex)
	 * @returns {*}
	 */
	loopDataSource:function(cbWithData) {
		if(!cbWithData) {
			console.error("can not loop dataSource without cb");
			return false;
		}

		if(!this.dataSource) {
			console.error("invalid dataSource to loop");
			return false;
		} else if('object' == typeof this.dataSource) {
			// -- Array object expected
			// -- never change the name 'json' b/c it will be evaluated
			var json = MF_BindData.prototype.getDataSourceParsed.call(this);

			// -- Loop and call back
			var destChildCount = MF_BindData.prototype.getJQDest.call(this).children().length;
			for(var i = 0; i < json.length; i++) {
				var key = i;
				var value = json[key];
				var myIndex = destChildCount + i;

				cbWithData(key, value, json, myIndex);
			}

			return json.length;
		} else {
			// -- String type
			var destChildCount = MF_BindData.prototype.getJQDest.call(this).children().length;
			cbWithData(0, this.dataSource, this.dataSource, destChildCount);
			return 1;
		}
	},

	clearDestIfNecessary: function() {
		if(true === this.clear) {
			this.JQDest.empty();
		}

		return this.clear;
	},

	appendParent: function(anything) {
		this.JQDest.append(anything);
	},

	bindSimple: function(JQDest, value) {
		if(JQDest)
			MF_BindData.prototype.setDest.call(this, JQDest);
		if(value)
			MF_BindData.prototype.setDataSource.call(this, value);

		// -- Starts
		var theHtml = MF_BindData.prototype.getJQDest.call(this).html();
		if(!theHtml) {
			console.error("Bind Simple failure JQDest html is invalid check your JQuery selector : " + getJQDest().selector);
			return;
		}

		var combineList = this.combine.createCombineList(theHtml);

		// -- adjusting value str
		var json = MF_BindData.prototype.getDataSourceParsed.call(this);

		theHtml = this.combine.combineValue(theHtml, combineList, 0, json, json, 0, this.innerFunc);

		MF_BindData.prototype.getJQDest.call(this).html(theHtml);
	},

	bindRepeat: function(JQDest, dataSource, template) {
		var self = this;
		if(JQDest)
			MF_BindData.prototype.setDest.call(this, JQDest);
		if(dataSource)
			MF_BindData.prototype.setDataSource.call(this, dataSource);
		if(template)
			MF_BindData.prototype.setTemplate.call(this, template);

		// -- Starts
		MF_BindData.prototype.clearDestIfNecessary.call(this);
		MF_BindData.prototype.loopDataSource.call(this, function(key, value, json, myIndex) {
			// -- found Template is array type, always function
			var templateFound = self.template.findTemplate(key, value, json, myIndex);

			if('string' == typeof templateFound) {
				// -- plain text or function type
				MF_BindData.prototype.appendParent.call(self, templateFound);
			} else if('object' == typeof templateFound) {
				// -- Plural template
				if(0 < templateFound.length) {
					for(var i = 0; i < templateFound.length; i++) {
						var resultHtml = self.combine.combineValue(templateFound[i].template, templateFound[i].combineList, key, value, json, myIndex, self.innerFunc);
						MF_BindData.prototype.appendParent.call(self, resultHtml);
					}
				} else {
					// -- Singular template
					// -- Cached object type, need to combine it again
					var resultHtml = self.combine.combineValue(templateFound.template, templateFound.combineList, key, value, json, myIndex, self.innerFunc);
					MF_BindData.prototype.appendParent.call(self, resultHtml);
				}
			} else {
				console.info("No Template found its usually error with template setting!");
			}
		});
	},

	/**
	 * Bind single object with detail usually key is not a number
	 * @param JQDest
	 * @param requestKey
	 * @param template
	 */
	bindError: function(JQDest, requestKey, template) {
		if(JQDest)
			MF_BindData.prototype.setDest.call(this, JQDest);
		if(template)
			MF_BindData.prototype.setTemplate.call(this, template);

		MF_BindData.prototype.clearDestIfNecessary.call(this);
		var templateFound = this.template.findTemplate(requestKey, { msg: requestKey }, [], requestKey);
		if('string' == typeof templateFound) {
			// -- plain text or function type
			MF_BindData.prototype.appendParent.call(this, templateFound);
		} else if('object' == typeof templateFound) {
			// -- Plural template can have default, so filter it with string compare
			if(0 < templateFound.length) {
				for(var i = 0; i < templateFound.length; i++) {
					// -- The Default should never used!
					if(true === templateFound[i].condition)
						continue;

					if(0 <= templateFound[i].condition.indexOf(requestKey)) {
						templateFound = templateFound[i];
					}
				}
			}

			// -- Singular template, or filtered template
			// -- Cached object type, need to combine it again
			var resultHtml = this.combine.combineValue(templateFound.template, templateFound.combineList, requestKey, { msg: requestKey }, [], requestKey, this.innerFunc);
			MF_BindData.prototype.appendParent.call(this, resultHtml);
		}
	}
};

var MF_FIFOCache = function() {
	this.cache = [];
	this.cacheLimit = 10;
};

MF_FIFOCache.prototype = {
	clearCache: function() {
		this.cache = [];
	},

	getCache: function(key) {
		for(var i = 0; i < this.cache.length; i++) {
			if(key == this.cache[i].key)
				return this.cache[i].value;
		}

		return false;
	},

	putCache: function(key, value) {
		var item = {
			key: key,
			value: value
		};

		this.cache.push(item);

		// -- Adjust cache limit
		if(0 < this.cacheLimit && this.cache.length > this.cacheLimit) {
			this.cache.shift();
		}
	},

	// -- 0 : Unlimited, number : limited cache fifo
	setCacheLimit: function(limit) {
		this.cacheLimit = limit;
	}
};


var MF_Request = function() {
	this.cache = 0; // -- Delayed initial
	this.cb = 0;
	this.useInnerCache = false;

	// -- Ajax setting value
	this.ajax = {
		type: MF_CONST.AJAX_TYPE,
		dataType: MF_CONST.AJAX_DATA_TYPE,
		url: 0,
		cache: false
	};
};

MF_Request.prototype = {
	TYPE_PROGRESS: 1,
	TYPE_TRANSFER: 2,

	PROGRESS_SHOW: 1,
	PROGRESS_HIDE: 2,

	TRANSFER_DONE: 1,
	TRANSFER_FAIL: 2,
	TRANSFER_FINISHED: 3,

	setCallback: function(cb) {
		this.cb = cb;
	},

	setUrl: function(url) {
		this.ajax.url = url;
	},

	setUseInnerCache: function(use) {
		this.useInnerCache = use;
		this.ajax.cache = use;

		if(true == use) {
			this.cache = new MF_FIFOCache();
			this.cache.setCacheLimit(10);
		}
	},

	_defaultCallback: function(type, subType, obj1, obj2) {
		if(!this.cb) {
			console.info("No callback has set");
			return;
		}

		if(MF_Request.prototype.TYPE_PROGRESS == type && this.cb.cbProgress) {
			this.cb.cbProgress(subType == MF_Request.prototype.PROGRESS_SHOW);
		} else if(MF_Request.prototype.TYPE_TRANSFER == type && this.cb.cbTransfer) {
			this.cb.cbTransfer(subType, obj1, obj2);
		}
	},

	request: function() {
		var self = this;
		if(!this.ajax.url) {
			console.error("Error no url set");
			return false;
		}

		// -- If you have it already
		if(this.useInnerCache) {
			var cachedData = this.cache.getCache(this.ajax.url);
			if (cachedData) {
				MF_Request.prototype._defaultCallback.call(this, MF_Request.prototype.TYPE_TRANSFER, MF_Request.prototype.TRANSFER_DONE, cachedData);
				MF_Request.prototype._defaultCallback.call(this, MF_Request.prototype.TYPE_TRANSFER, MF_Request.prototype.TRANSFER_FINISHED, cachedData);
				return true;
			}
		}

		// -- Show Progress
		MF_Request.prototype._defaultCallback.call(this, MF_Request.prototype.TYPE_PROGRESS, MF_Request.prototype.PROGRESS_SHOW);

		// -- Request
		var req = $.ajax({
			type: this.ajax.type,
			dataType: this.ajax.dataType,
			url: this.ajax.url,
			cache: this.ajax.cache
		}).done(function(json) {
			// -- Save it to inner cache
			if(self.useInnerCache)
				self.cache.putCache(self.ajax.url, json);

			// -- Callback
			MF_Request.prototype._defaultCallback.call(self, MF_Request.prototype.TYPE_TRANSFER, MF_Request.prototype.TRANSFER_DONE, json);
		}).fail(function(data) {
			MF_Request.prototype._defaultCallback.call(self, MF_Request.prototype.TYPE_TRANSFER, MF_Request.prototype.TRANSFER_FAIL, data);
		});
		req.always(function(json) {
			MF_Request.prototype._defaultCallback.call(self, MF_Request.prototype.TYPE_PROGRESS, MF_Request.prototype.PROGRESS_HIDE);
			MF_Request.prototype._defaultCallback.call(self, MF_Request.prototype.TYPE_TRANSFER, MF_Request.prototype.TRANSFER_FINISHED, json);
		});

		return true;
	}
};

var MF_BindDataRequest = function() {
	this.userCB = 0;
	this.useTemplateLoading = true; // -- Key - 'loading'
	this.useTemplateError = true; // -- Key - 'error'
	this.useTemplateNoItem = true; // -- Key - 'zero'
	this.chainAction = false; // -- Send change event to destination JQ, like 'change()'

	this.invokation = MF_BindDataRequest.prototype.INVOKE_REPEAT; // -- What to do next, its string, set by bindRepeat. bindSimple

	this.innerBinder = new MF_BindData();
	this.innerRequest = new MF_Request();
	this.innerRequest.setCallback(this._bindDataRequestCallback());

	// -- Outter interface just easy of use
	this.r = this.innerRequest;
	this.b = this.innerBinder;
};

MF_BindDataRequest.prototype = {
	KEY_LOADING: MF_CONST.KEY_LOADING,
	KEY_NO_ITEM: MF_CONST.KEY_NO_ITEM,
	KEY_ERROR: MF_CONST.KEY_ERROR,
	INVOKE_SIMPLE: 'bindSimple',
	INVOKE_REPEAT: 'bindRepeat',

	setUseTemplateLoading: function(use) {
		this.useTemplateLoading = use;
	},

	setUseTemplateError: function(use) {
		this.useTemplateError = use;
	},

	setUseTemplateNoItem: function(use) {
		this.useTemplateNoItem = use;
	},

	setUseChainAction: function(action) {
		this.useChainEvent = action;
	},

	setCallback: function(cb) {
		this.userCB = cb;
	},

	_bindDataRequestCallback: function() {
		var self = this;
		var cb = {
			cbProgress: function(show) {
				// -- CBProgress
				if(self.userCB && self.userCB.cbProgress)
					self.userCB.cbProgress(show);

				// -- Loading template
				if(true == show && self.useTemplateLoading)
					self.innerBinder.bindError(false, MF_BindDataRequest.prototype.KEY_LOADING, false);

			},
			cbTransfer: function(subType, obj1, obj2) {
				var json = obj1;

				// -- CBTransfer
				if(self.userCB && self.userCB.cbTransfer) {
					// -- To prevent to call not implemented callback
					var temp = self.userCB.cbTransfer(subType, obj1, obj2);
					if('undefined' == typeof temp)
						json = obj1;
				}

				// -- Process to bind, error, finish
				if(MF_Request.prototype.TRANSFER_DONE == subType) {
					// -- Use json here, list is not literally list it can be just json object
					var list = json;

					if(!list) {
						console.info("MF_Request TRANSFER_DONE but list is INVALID not empty!, other process is ignored");
						return;
					}

					if(MF_BindDataRequest.prototype.INVOKE_SIMPLE == self.invokation) {
						self.innerBinder.bindSimple(false, list);
					} else if(MF_BindDataRequest.prototype.INVOKE_REPEAT == self.invokation) {
						// -- bind Error can removed the data, so put data source explicit
						self.innerBinder.bindRepeat(false, list, false);

						// -- Order Critical, those two statement should not be mixed!

						// -- Test value str to count the list
						if(true == self.useTemplateNoItem) {
							self.innerBinder.setDataSource(list);
							var tempListToCount = self.innerBinder.getDataSourceParsed();
							// -- Set data source temporary to parse with value str
							if(0 == tempListToCount.length)
								self.innerBinder.bindError(false, MF_BindDataRequest.prototype.KEY_NO_ITEM, false);
						}
					}

				} else if(MF_Request.prototype.TRANSFER_FAIL == subType && true == self.useTemplateError) {
					self.innerBinder.bindError(false, MF_BindDataRequest.prototype.KEY_ERROR, false);
				} else if(MF_Request.prototype.TRANSFER_FINISHED == subType && self.useChainEvent) {
					var listChainEvent = self.useChainEvent.split(';');
					for(var listChainLoop = 0; listChainLoop < listChainEvent.length; listChainLoop++) {
						var theAction = "self.innerBinder.getJQDest()." + listChainEvent[listChainLoop];
						// -- Invoke it
						eval(theAction);
					}
				}
			}
		};
		return cb;
	},

	bindSimple: function(JQDest, url) {
		this.invokation = MF_BindDataRequest.prototype.INVOKE_SIMPLE;

		this.setUseTemplateError(false);
		this.setUseTemplateLoading(false);
		this.setUseTemplateNoItem(false);

		this.innerBinder.setClear(false);
		if(JQDest)
			this.innerBinder.setDest(JQDest);
		if(url)
			this.innerRequest.setUrl(url);

		this.innerRequest.request();
	},

	bindRepeat: function(JQDest, url, template) {
		this.invokation = MF_BindDataRequest.prototype.INVOKE_REPEAT;

		// -- default 'clear' is true but you can change it if you want but Template will make it mess

		if(JQDest)
			this.innerBinder.setDest(JQDest);
		if(url)
			this.innerRequest.setUrl(url);
		if(template)
			this.innerBinder.setTemplate(template);

		this.innerRequest.request();
	}
};

/**
 * Do not call MF_SelectChain.r.setUrl(url) b/c SelectChain will replace it with my url
 * @constructor
 */
var MF_SelectChain = function() {
	MF_BindDataRequest.call(this);

	this.url = 0;
};

var MF_SelectChainInheritsInit = function() {
	// -- Inheriting tricks : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
	MF_SelectChain.prototype = Object.create(MF_BindDataRequest.prototype);
	MF_SelectChain.prototype.constructor = MF_SelectChain;

	// -- I Do not know but this should be defined this way!

	MF_SelectChain.prototype.setUrl = function(url) {
		this.url = url;
	};

	MF_SelectChain.prototype.setSource = function(JQSource) {
		this.src = JQSource;
	};

	/**
	 * set change listener to the Src, request url, update dest with template
	 * @returns {boolean}
	 */
	MF_SelectChain.prototype.setSecondary = function() {
		var self = this;
		if(!this.src) {
			console.error("SelectChain setSecondary - Source object is not set");
			return false;
		}

		if(!this.url) {
			console.error("SelectChain setSecondary - url is not set, do not set with r.setUrl(), set me directly");
			return false;
		}

		// -- Remove All change event handler
		this.src.off('change');
		this.src.change(function() {
			self.onChangeSrc();
		});


		// -- set Request object to use cache, default set, if you want to change it, make another interface
		this.r.setUseInnerCache(true);
		return true;
	};

	MF_SelectChain.prototype.onChangeSrc = function() {
		// -- Url mixing
		var selectedValue = this.src.val();
		var mixedUrl = this.getMixedUrl(selectedValue);

		this.r.setUrl(mixedUrl);
		// -- request.callback = MF_BindDataRequest._defaultCallback
		this.bindRepeat();
	};

	/**
	 * original url has #selectedValue# so replace it with selected value
	 * @param selectedValue
	 * @returns {*}
	 */
	MF_SelectChain.prototype.getMixedUrl = function(selectedValue) {
		// -- Call cb and test if it implemented
		var newUrl = null;
		if('function' == typeof this.url) {
			newUrl = this.url(selectedValue);
			if(newUrl && 0 < newUrl.length)
				return newUrl;

		}

		//if(this.userCB && this.userCB.cbCreateUrl) {
		//	newUrl = this.userCB.cbCreateUrl(selectedValue);
		//	if(newUrl && 0 < newUrl.length)
		//		return newUrl;
		//}

		// -- Otherwise use default one
		var mixedUrl = this.url.replace(/#selectedValue#/, selectedValue);
		return mixedUrl;
	};
};

// -- Should be globally called, I just scoped them for pretty look
MF_SelectChainInheritsInit();


/****
 * Area HELPER
 ****/

// -- Basic Helper
var MF_BasicHelper = function(binder, JQObject) {
	// -- Then other things...
	var tagName = JQObject[0].tagName;
	// -- Optional
	var optionTemplate = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_TEMPLATE);
	var optionClear = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_CLEAR);
	var optionFunc = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_FUNCTION);
	var optionValueStr = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_VALUE_STR);

	if(optionTemplate) {
		optionTemplate = $(optionTemplate);
		binder.setTemplate(optionTemplate);
	}

	if(optionClear) {
		optionClear = eval(optionClear);
		binder.setClear(optionClear);
	}

	if(optionFunc) {
		optionFunc = eval(optionFunc);
		binder.addInnerFunc(optionFunc);
	}

	if(optionValueStr) {
		binder.setValueStr(optionValueStr);
	}
};

MF_BasicHelper.prototype = {
	ATTR_DATA_SOURCE: MF_CONST.ATTR_DATA_SOURCE,
	ATTR_TEMPLATE: MF_CONST.ATTR_TEMPLATE,
	ATTR_SOURCE: MF_CONST.ATTR_SOURCE,
	ATTR_OPTION_CLEAR: MF_CONST.ATTR_OPTION_CLEAR,
	ATTR_OPTION_FUNCTION: MF_CONST.ATTR_OPTION_FUNCTION,
	ATTR_OPTION_VALUE_STR: MF_CONST.ATTR_OPTION_VALUE_STR,
	ATTR_OPTION_URL: MF_CONST.ATTR_OPTION_URL,
	ATTR_OPTION_CALLBACK: MF_CONST.ATTR_OPTION_CALLBACK,
	ATTR_OPTION_CHAIN_ACTION: MF_CONST.ATTR_OPTION_CHAIN_ACTION
};

var MF_BindDataHelper = function(JQObject) {
	// -- Check JQObjest - destination which is most important!
	if(!JQObject instanceof jQuery) {
		console.error("Invalid argument with MF_BindDataHelper that should be jQuery object");
		return false;
	}

	// -- Check 'url' for judge if its for request or normal
	var binder = null;
	var url = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_URL);
	var dataSource = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_DATA_SOURCE);

	// -- Note MF_BindDataRequest has 'b' which is MF_BindData so Helper can do it correctly
	if(url) {
		binder = new MF_BindDataRequest();
		binder.r.setUrl(url);
		binder.b.setDest(JQObject);
		MF_BasicHelper(binder.b, JQObject);

		// -- Special only for MF_BindDataRequest
		var optionChainAction = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_CHAIN_ACTION);
		if(optionChainAction) {
			binder.setUseChainAction(optionChainAction);
		}

		var optionCallback = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_CALLBACK);
		if(optionCallback) {
			optionCallback = eval(optionCallback);
			binder.setCallback(optionCallback);
		}
	} else if(dataSource){
		binder = new MF_BindData();
		dataSource = eval(dataSource);
		binder.setDataSource(dataSource);
		binder.setDest(JQObject);
		MF_BasicHelper(binder, JQObject);
	} else {
		console.error("You should have url or datasource but both are empty");
		return false;
	}

	return binder;
};

var MF_SelectChainHelper = function(JQObject) {
	// -- Check JQObjest - destination which is most important!
	if(!JQObject instanceof jQuery) {
		console.error("Invalid argument with MF_SelectChainHelper that should be jQuery object");
		return false;
	}

	// -- Check 'url' for judge if its for request or normal
	var binder = new MF_SelectChain();
	var url = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_URL);
	var source = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_SOURCE);

	// -- Special only for MF_BindDataRequest
	var optionChainAction = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_CHAIN_ACTION);
	if(optionChainAction) {
		binder.setUseChainAction(optionChainAction);
	}
	var optionCallback = JQObject.MF_GetDataAttr(MF_BasicHelper.prototype.ATTR_OPTION_CALLBACK);
	if(optionCallback) {
		optionCallback = eval(optionCallback);
		binder.setCallback(optionCallback);
	}

	if(!source) {
		// -- Find the sibling before me 'select'
		console.error("Invalid argument with MF_SelectChainHelper No source given");
		return false;
	}

	source = $(source);

	// -- Can be replaced with callback. so its optional
	if(url) {
		if('@' == url[0]) {
			// -- "@GlobalFunctionName" without ()
			// -- Function type
			url = url.substr(1);
			url = eval(url);
			binder.setUrl(url);
		} else {
			binder.setUrl(url);
		}
	}

	binder.b.setDest(JQObject);
	binder.setSource(source);

	// -- Basic things
	MF_BasicHelper(binder.b, JQObject);

	return binder;
};

// -- Extend JQuery function to set it right away! returns each "BINDER". not a jquery object
$.fn.MF_BindSimple = function() {
	var binder = MF_BindDataHelper(this);
	binder.bindSimple();
	return binder;
};

$.fn.MF_BindRepeat = function() {
	var binder = MF_BindDataHelper(this);
	binder.bindRepeat();
	return binder;
};

$.fn.MF_BindSelect = function() {
	var binder = MF_SelectChainHelper(this);
	binder.setSecondary();
	return binder;
};
