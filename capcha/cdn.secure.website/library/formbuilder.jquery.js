if(typeof onWSFormLoad === 'undefined' && typeof jQuery !== 'undefined') {
	(function($){

		var isEmpty = function(str) {
			if(str && str.replace(/[\s]*/g, '') != '') {
				return true;
			} else {
				return false;
			}
		};

		var getURLParameter = function(name) {
			var name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]")
			,	regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
			,	results = regex.exec(location.search);

			return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		};

		var checkForErrors = function(error){
			var error = error || getURLParameter('form_error');
			switch(error) {
				case 'captcha' :
					var f_cont = $('#fancyFormBuilder_' + getURLParameter('formid'))
					  , message = 'Captcha field was entered incorrectly. Please try again.'
					  , captcha = f_cont.length ? f_cont.find('li[data-input="recaptcha"]') : $('li[data-input="recaptcha"]');

					if(captcha.length) {
						captcha.addClass('error').append('<div class="message message-under message-alert">' + message + '</div>');
						$('html, body').animate({
							scrollTop: captcha.parents('form').offset().top - 20
						}, 500);
					} else {
						alert(message);
					}
					break;

				case 'not_setup':
					var btn_li = $('[data-id="wssubmit"]').parent()
					  , ptop = btn_li.css('padding-top')
					  , message = 'This form has not been setup yet'
					  , right = Math.max((parseInt(btn_li.css('padding-left')) || 0), 10) + 'px';

					btn_li.addClass('error')
						  .css('padding-bottom', btn_li.css('padding-top')) // Make padding top and bottom the same
						  .append('<div class="message message-right message-alert" style="right: ' + right + ';">' + message + '</div>');
					break;
			}
		};

		var onWSFormSubmit = function(e) {
			var countFields = 0
			,	countEmpty = 0
			,	halt = $(this).data('halt') || false
			,	$return = true;

			$(this).find('.inp-con:not(.sub)').each(function(){
				var required = $(this).data('required');
				var input;
				if(typeof required !== 'undefined' && parseInt(required)) {
					switch($(this).data('input')) {
						case 'textarea':
							input = $(this).find('textarea');
						case 'name':
						case 'number':
						case 'email':
						case 'phone':
						case 'text':
						case 'date':
						case 'time':
							input = (typeof input === 'undefined') ? $(this).find('input') : input;
							if(input.length && ! isEmpty(input.val())) {
								var li = input.parents('li').first();
								var label = li.find('label');
								input.get(0).focus();
								label = (label.length && label.text() != '') ? label.text().replace('*', '').replace(/\n/g, '') + ' is' : 'You missed';
								alert(label + ' a required field');
								e.preventDefault(); //prevent default form submit
								$return = false;
								return false;
							}
							break;
						case 'radio':
							input = $(this).find('input[type="radio"]');
							if( ! input.is(':checked')) {
								var li = input.parents('li');
								var label = li.find('label').first();
								$('html, body').scrollTop( $(label).offset().top );
								label = (label.length && label.text() != '') ? label.text().replace('*', '').replace(/\n/g, '') + ' is' : 'You missed';
								alert(label + ' a required field');
								e.preventDefault(); //prevent default form submit
								$return = false;
								return false;
							}
							break;
						case 'checkbox':
							input = $(this).find('input[type="checkbox"]');
							if( ! input.is(':checked')) {
								var li = input.parents('li');
								var label = li.find('label').first();
								$('html, body').scrollTop( $(label).offset().top );
								label = (label.length && label.text() != '') ? label.text().replace('*', '').replace(/\n/g, '') + ' is' : 'You missed';
								alert(label + ' a required field');
								e.preventDefault(); //prevent default form submit
								$return = false;
								return false;
							}
							break;
					}
				}

				countFields++;

				var field = $(this).find('input, textarea, select');

				if( field.length > 0 ){
					if( field.is('input[type="radio"], input[type="checkbox"]') && ! field.is(':checked') ){
						countEmpty++;
					} else if( field.is('select') && (field.val() === '' || field.val() === 'empty') ){
						countEmpty++;
					} else if( field.is('input[type="text"]') && ! isEmpty(field.val()) ){
						countEmpty++;
					}
				}


			});

			if($return === false){
				e.preventDefault();
				return false;
			}

			if(countFields === countEmpty){
				alert('Please fill out the form to continue');
				e.preventDefault();
				return false;
			}

			var input = $(this).find('#recaptcha_response_field');
			if(input.length && input.val() == '') {
				alert('Captcha is a required field');
				return false;
			}

			var input = $(this).find('#g-recaptcha-response'); // reCaptcha v2
			if(input.length && input.val() == '') {
				alert('Please verify the captcha to continue');
				return false;
			}

			var payment = $(this).find('input[name="payment_processor"]').length == 0 ? false : true;

			if(halt) {
				if(typeof halt === 'function') {
					halt(e);
				}
				e.preventDefault();
				return false;
			}

			if( $(this).data('ajax-bypass') === false && payment === false){
				sendFormViaAjax(this);
				$(this).find('[type=submit]').prop('disabled', true);
				e.preventDefault();
				return false;
			}
		};

		var sendFormViaAjax = function(form){
			var	form = $(form)
			,	url = form.attr('action').replace('submit.new.php', 'submit.ajax.php')
			,	devSubDomain = ['kashif', 'humayun', 'connor', 'gio']
			,	isDev = false;

			$.each(devSubDomain, function(){
				if( url.indexOf(this) != -1) isDev = true;
			});

			if(!isDev){
				url = url.replace('http://', 'https://');
			}

			$.ajax({
				type: "POST",
				url: url,
				data: form.serialize(),
				crossDomain: true,
				dataType: "JSON",
				cache: false
			}).done(function(data){

				form.find('[type=submit]').prop('disabled', false);

				if(data.form_error){
					checkForErrors(data.form_error);
					return false;
				}

				if(data.success && data.message){
					alert(data.message);
				}

				if(data.redirect){
					location.href = data.redirect;
				}

				if(data.submitForCaptcha || data.submitForPayment){
					form.data('ajax-bypass', true);
					form[0].submit();
				} else {
					wseReCaptcha.reset(form);
				}
			}).error(function(xhr, status) {

				form.find('[type=submit]').prop('disabled', false);
			});
		};

		var putFormClasses = function(){
			$('.wsform ul li').each(function(){
				var el = $(this).find('input:not([type=hidden]), select, textarea');

				el.focus(function(){
					$(this).parents('li:not(.sub)').addClass('focus');
				}).blur(function () {
					if( !($(this).val() == '' || $(this).val() == 'empty') ) {
						$(this).parents('li:not(.sub)').addClass('has-value');
					}else{
						$(this).parents('li:not(.sub)').removeClass('has-value');
					}
					$(this).parents('li:not(.sub)').removeClass('focus');
				});

				$(el).each(function(){
					if( $(this).attr('placeholder') ){
						$(this).parents('li:not(.sub)').addClass('has-placeholder');
					}
					if( !($(this).val() == '' || $(this).val() == 'empty') ) {
						$(this).parents('li:not(.sub)').addClass('has-value');
					}
				});
			});
		};

		var ajaxLoad = function(urls, callback){

			if(typeof urls === 'string') {
				urls = urls.split(',');
			}

			var loaded = 0
			,	callback = callback || function(){};

			$.each(urls, function(){

				var url = this;

				$.ajax({
					url: url,
					method: "GET",
					dataType: "script",
					cache: true
				}).done(function(){

					loaded++;

					if(loaded >= urls.length) {
						callback();
					}
				}).fail(function(){

					loaded++;

					if(console && console.log) {
						console.log('failed to load url: ' + url);
					}
				});
			});

		};

		var datepicker_init = function(){
			var url = 'cdn.secure.website';

			$('head').append('<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">');

			ajaxLoad(
				[
				 'https://'+url+'/library/jquery/material-datetimepicker/material/material.min.js',
				 'https://'+url+'/library/jquery/material-datetimepicker/js/bootstrap-material-datetimepicker.js'
				], function(){

					var defaultTimeConf = {date: false, format: 'HH:mm', shortTime: true, clearButton: true}
					,	defaultDateConf = {weekStart: 0, time: false, beforeChange: putFormClasses, format: 'MM-DD-YYYY', clearButton: true}
					,	onPicked = function(){
							$(this).trigger('blur').trigger('focus');
						};

					if( typeof $.fn.bootstrapMaterialDatePicker === 'function' ){

						if($('.wse-frm li[data-input=time]').length > 0) {
							$('.wse-frm li[data-input=time] input').each(function(){
								var params = {}
								,	shortTime = $(this).data('short-time') || '';

								if(shortTime !== '' ){
									params.shortTime = (shortTime == 1 ? true : false);

									if(params.shortTime){
										params.format = 'hh:mm a';
									}
								}
								params = $.extend(defaultTimeConf, params || {});

								$(this).bootstrapMaterialDatePicker(params).on('change', onPicked);
							});
						}

						if($('.wse-frm li[data-input=date]').length > 0) {
							$('.wse-frm li[data-input=date] input').each(function(){
								var params = {}
								,	format = $(this).data('format') || '';

								if(format !== '' ){
									params.format = format;
								}
								params = $.extend(defaultDateConf, params || {});
								$(this).bootstrapMaterialDatePicker(params).on('change', onPicked);
							});
						}
					}
				}
			);
		};

		var wseReCaptcha = {
			k: '6LdoIDwUAAAAAPjVZOvZpvFwYiryxOTuCDRkhPGk',
			callback: function(){
				$('.wsform').each(function(){
					 wseReCaptcha.render($(this));
				});
			},
			render: function(form){
				var cap = form.find('li[data-input="recaptcha"]');
				if(cap.length) {
					var el = $('.wse-grecaptcha', cap);

					if(el.length) {
						var conf = {sitekey: wseReCaptcha.k};
						var size = el.parents('li').data('size') || false;
						if(size) {
							conf.size = size;
						}

						var widgetId = grecaptcha.render(el[0], conf);
						el.data('widget-id', widgetId);
					}
				}
			},
			reset: function(form){
				var cap = form.find('li[data-input="recaptcha"]');
				if(cap.length) {
					var el = $('.wse-grecaptcha', cap);

					if(el.length) {
						grecaptcha.reset(el.data('widget-id'));
					}
				}
			}
		};

		window.wse_recaptcha_callback = wseReCaptcha.callback;

		$(document).ready(function(){
			$('.wsform').submit(onWSFormSubmit).data('ajax-bypass', false);
			$('input[name="payment_amount"]').keyup(function(){

				value = $(this).attr('value');
				var data = $('div[data-payment="amount"]').html() || '';
				var currency_data = data.split(' ');
				var currency = currency_data[0];
				var currency_symbol = currency_data[2];


				var amount = value.split('.');
				if(amount.length > 1) {
					var dollars = amount[0];
					var cents = amount[1];
					cents = cents.substr(cents.length - 2);
					var newVal = dollars + '.' + cents;
					$(this).attr('value', newVal);
				}

				// string = value.substr(value.indexOf(".")); // Allow only two characters
				// console.log(string);

				$('div[data-payment="amount"]').empty().append(currency + ' ' + $(this).val() + ' ' + currency_symbol);
				if( ! value)
				{
					$('div[data-payment="amount"]').empty().append(currency + ' ' + '0.00' + ' ' + currency_symbol);

				}
			});
			checkForErrors();
			putFormClasses();

			if($('.wse-frm li[data-input=time], .wse-frm li[data-input=date]').length > 0 && typeof formBuilder === "undefined"){
				datepicker_init();
			}

			if( typeof jQuery.fn.bootstrapMaterialDatePicker === 'function' ){

				$('head').append('<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">');

				if($('.wse-frm li[data-input=time]').length > 0){
					$('.wse-frm li[data-input=time] input').bootstrapMaterialDatePicker({date: false});
				}
				if($('.wse-frm li[data-input=date]').length > 0){
					$('.wse-frm li[data-input=date] input').bootstrapMaterialDatePicker({weekStart: 0, time: false});
				}
			}

			if($('.wsform li[data-input="recaptcha"]').length && typeof formBuilder == "undefined") {
				ajaxLoad('https://www.google.com/recaptcha/api.js?onload=wse_recaptcha_callback&render=explicit');
			}
		});

	})(jQuery);
	var onWSFormLoad = true;
}
