/**************************
 *
 * GT-Class 1.0 beta 1 
 *
 *    GT-Class is a Classes-Framework for Javascript. 
 *
 *      author  : fins(大城小胖)
 *		twitter : @finscn 
 *      blog : http://fins.javaeye.com  
 *
 * Copyright 2010-2012 original author(fins). All rights reserved.
 * 
 * Released under the MIT License.
 *
 *
 * (我都不知道上面那一坨英文写的对不对,我只是照猫画虎东拼西凑出来的...囧)
 *
 **************************/


window.GT=window.GT||{};


/***
 *  对象合并方法. 将 对象 po 中的属性加入so中.
 *    如果出现重名的属性,保留so中的原有属性.如果只指定一个参数,则相当于进行一个"单层的浅克隆".
 **/
GT.merger = function(so, po) {
		if (arguments.length<2) {
			po = so;
			so = {};
		}
		for ( var key in po) {
			if (!(key in so) ) {
				so[key] = po[key];
			}
		}
		return so;
	};


/* 定义常量. */
GT.CONST = GT.merger({
				'classname' : 'classname',
				'superclass' : 'superclass',
				'$superclass' : '$superclass',
				'__$super__' : '__$super__'
			},GT.CONST);



/***********************************************/


/***
 * 
 *  定义所有类的基类. 
 *  可以理解为 使用该框架创建的所有的"类" 都是GT.Class的子类.
 *  
 **/
GT.Class=(function(){ 
	function Class(){ /* The Top Class */ } 
	return Class;
})();


/***
 * 
 *  给GT.Class添加若干工具方法.
 *   相当于静态方法,但GT.Class的子类没有这些方法.
 *   通过 GT.Class.METHOD_NAME(...) 的方式调用.
 * 
 **/
GT.merger(GT.Class ,{


	/* 取得常量. */
	getConst : function(){
		return GT.CONST;
	},
	
	/* 是否支持 对父类的调用 */
	supportSuper : true,
	/***
	 * 
	 *  判断一个方法中是否出现了 $super 代码.
	 *    该方法不建议公开.
	 * 
	 **/
	__usedSuper__ : (function(){
			var probe_super = (function(){$super();}).toString().indexOf('$super') > 0;
			return function(obj) {
				return !probe_super || obj.toString().indexOf('.$super(')>0;
			}
		})(),
	
	/* 声明接口时 所使用的常量 */
	$abstract : function(){ return "< This is an abstract method >"; } ,
	
	/***
	 * 
	 *  创建一个类. 参数形式:
	 *  形式1:  子类的构造函数, [子类的成员], [父类]
	 *  形式2:  子类的成员, [父类]
	 * 
	 *    该方法主要为了兼容多种参数形式, 创建类的核心代码在 __create__ 中
	 *  
	 **/
	create : function(constructor, prototype, superclass) {
		
		var C= GT.Class.getConst();

		if ( typeof prototype =='function' ) {
			var _tmp=superclass;
			superclass = prototype;
			prototype = _tmp;
		}

		if (typeof constructor !='function') {
			prototype = constructor;
			constructor=null;
		}
		
		prototype = prototype || {};
		superclass = superclass|| prototype[C.superclass] || GT.Class;
		constructor = constructor ||function() { 
					this.$super.apply(this,arguments);
				}

		return GT.Class.__create__(constructor, superclass, prototype);

	},
	

	/***
	 * 
	 *  创建一个类. 参数形式:
	 *  形式1:  子类,父类, [子类的成员]
	 *  
	 *  参数"子类的成员"具有最高优先级,
	 *  当 "子类" "父类" 和 "子类的成员"三个参数中 有同名成员时, 最终保留的是 "子类的成员"里的内容.
	 *  
	 *    该方法不建议公开,因为对参数要求比较严格, 使用不便, 建议使用 GT.Class.create .
	 *
	 **/
	__create__ : function(sb,sp, orp) {
		
		var C= GT.Class.getConst();

		var spp = sp.prototype,
			sbp = null ,
			osbp= sb.prototype, /* 保留子类的原始prototype */
			orp = orp || {} ;

		// 先让子类的prototype变成父类的prototype.
		//   注意,这里不能直接让 sb.prototype = spp,要将子类和父类的prototype隔离.
		var F = function(){};
		F.prototype = spp;
		sbp = sb.prototype = new F();

		//将子类的原始prototype和orp中的成员进行合并,通常osbp内容会比较少(为空),所以遍历osbp.
		for ( var p in osbp) {
			if (!(p in orp)){
				orp[p]=osbp[p];
			}
		}

		
		for ( var p in orp) {
			var v=orp[p];
			//如果某方法的代码中出现了$super, 则在该方法上保留父类中的同名方法的引用,供"this.$super(...)"使用.
			if (this.supportSuper &&  typeof v =='function' && this.__usedSuper__(v)){
				v[C.__$super__]=sbp[p];
			}

			sbp[p] = v;
		}
		//确保 子类的constructor 和 执行instanceof操作 的正确性
		sbp.constructor=sb;
		/* 可通过 子类.$superclass 取得当前子类的 父类.prototype  */
		sb[C.$superclass]=spp; 
		/* 可通过 子类.superclass 取得当前子类的 父类  */
		sb[C.superclass]=sp;

		
		// 下面这行增加的方法用处不大,而且用不好就陷入死锁, 决定注释掉.
		// sbp[C.$superclass]=function(){ return spp; }

		if (this.supportSuper){
			sb[C.__$super__]=sp;
			// 在子类的某方法中, 通过 this.$super(...) 来调用父类中的同名方法
			sbp.$super = (function(){
				var m=arguments.callee.caller[ GT.Class.getConst().__$super__ ];
				return m.apply(this,arguments);
			});
		}


		//可选. 使用 父类.$create(子类) 创建父类的子类. 父类必须是用过 GT.Class.create创建的.
		sb.$create=function(_sb,_orp){
			return GT.Class.__create__(_sb,this,_orp);
		}
		//可选. 使用 子类.$extend(父类) 给子类添加父类. 子类必须是用过 GT.Class.create创建的.
		sb.$extend=function(_sp,_orp){
			return GT.Class.__create__(this,_sp,_orp);
		}

		//可选. 注册创建的类. 需要保留类注册功能,且指定classname.
		sb[C.classname]= sb[C.classname]||sbp[C.classname];
		if (sb[C.classname] && this.register) {
			this.register(sb[C.classname], sb);
		}
				
		return sb;
	},

	/* 辅助方法, 用来检测某类是否是抽象类. (原型中是否有"未实现的抽象方法"). 目前实际用途不大. */
	isAbstract : function(sb, throwErr){

		var C= GT.Class.getConst();
		var sbp=sb.prototype;
		
		var notImplements=[];
		for (var p in sbp){
			var v=sbp[p];						
			if (v===GT.Class.$abstract){
				notImplements.push(p);
			}
		}
		if (notImplements.length>0){
			
			if (throwErr){
				var sbName= "<"+ (sb[C.classname] || sb) +">";

				throw new Error( "The class " + sbName
						+ " must implement the inherited abstract methods : "
						+ notImplements.join(",") );
			}else{
				return true;
			}

		}
		
		return false;
		
	},
	
	/***********************************************
	 * 以下四个成员 cache register unregister forName 为"类注册"相关功能.
	 *   该功能可选.如不需要且想精简代码 ,可删除.
	 ***********************************************/

	/* 类的注册池. */
	cache : {},

	/* 可选.注册一个创建的类. 类名:类 */
	register : function(classname, classC) {
		this.cache[classname] = classC;
	},

	/* 可选.反注册一个创建的类 */
	unregister : function(classname) {
		var c=this.cache[classname];
		delete this.cache[classname];
		return c ;
	},

	/* 可选.根据注册的名字取得一个类 */
	forName : function(classname) {
		return this.cache[classname];
	},


	/* 根据参数和类名来创建类的实例 */
	/* 为某私有框架提供的专有方法,请无视吧. */
	newInstance : function(cfg, classname) {
		var C= GT.Class.getConst();

		if (cfg && cfg.constructor == Object.prototype.constructor) {
			classname = classname || cfg[C.classname];
			var c = this.forName(classname);
			if (c) {
				return new c(cfg);
			}
		}
		return cfg;
	}
});



GT.$class = function(constructor, prototype, superclass) {
	return new GT.Class.create(constructor, prototype, superclass);
};