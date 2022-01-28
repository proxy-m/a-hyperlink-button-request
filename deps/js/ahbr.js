function andThenMakeSmartLink (oldMarker, newMarker, confirmAction, onResponse, maxTimeout=500) {
	if (!oldMarker || !newMarker || oldMarker == newMarker || !oldMarker.startsWith('#') || !newMarker.startsWith('#')) {
		return false;
	}
	oldMarker = oldMarker.substring(1);
	newMarker = newMarker.substring(1);
	let toFunction = function (mayBeFunction, window) {
		if (typeof mayBeFunction !== 'function') {
			if ([';', '"', '\'', '(', ')', '[', ']', '{', '}', ' '].filter(function (e) { return mayBeFunction.indexOf(e) >= 0 }).length > 0) {
				return new window.Function(mayBeFunction);
			} else if (window[mayBeFunction]) {
				return function () { return this[mayBeFunction](...arguments) }.bind(window);
			} else {
				return new window.Function(mayBeFunction+'()');
			}
		} else {
			return mayBeFunction;
		}
	};
	$('a[href$="#'+oldMarker+'"]').each(function (i, e) {
		var t = $(e);
		var datas = t.data();
		//logger.debug(datas);
		
		if (datas.data) {
			try {
				if (datas.data.length || datas.data.length === '') {
					datas.data = decodeURIComponent(datas.data);
					datas.data = Object.fromEntries(new URLSearchParams(datas.data));
				}
			} catch (e1) {
			}
			try {
				if (!datas.data.length) {
					datas.data = JSON.stringify(datas.data);
				}
			} catch (e2) {
			}
			try {
				datas.data = JSON.parse(datas.data);
			} catch (e3) {
				datas.data = "Error";
				return false;
			}													
		} else {
			datas.data = {};
		}
		
		var ar = (''+e.href).split('#');
		var dataAction = ar[0]; // href
		t.attr('href', dataAction+'#'+newMarker);

		t.data('onclick', toFunction(e.onclick ? e.onclick : t.data('onclick'), window));
		e.onclick = 'return false;';
		
		onResponse = onResponse || toFunction(t.data('onresponse'), window);
		
		var requestType = datas.requestType;
		switch (requestType) {
			case 'form':				
				var frname = 'dummyframe';
				var fr = $('iframe#'+frname)[0] || $('iframe[name="'+frname+'"]')[0];
				if (!fr) {
					fr = $('<iframe name="'+frname+'" id="'+frname+'" style="display: none;"></iframe>');
					$('body').append(fr);
				}
				frname = $(fr).attr('name');
				
				var $form = $("<form></form>").attr({ method: datas.method || "get", action: dataAction, target: frname}).css("display","none");
				
				if (datas.data) {
					for (var key in datas.data) {
						$form.append($("<input/>").attr({type: "hidden", name: key, value: datas.data[key]}));
					}
				}
				$('body').append($form);
				t.data("postform",$form);
				
				t.click(function (ev) {
					ev.preventDefault();
					if ($(this).data("postform") && (!(confirmAction && (typeof confirmAction) === 'function') || confirmAction())) {
						$(this).data("postform").submit();
					} else {
						logger.warn("No .postform or canceled");
						return false;
					}
					var f = $(this).data("onclick") || function () {};
					$(this).data("onclick", "");
					$(this).css('pointer-events', 'none');
					$(this).css('cursor', 'default');
					setTimeout(function () {
						f();
						if (onResponse && (typeof onResponse) === 'function') {
							logger.warn('onResponse can not process data (postform)');
							onResponse(undefined);
						}
					}.bind(this), maxTimeout);
					return true;
				});
				break;
			case 'ajax':				
				t.data("postajax", "postajax");
				
				t.click(function (ev) {
					ev.preventDefault();
					var onResponseData = undefined;
					if ($(this).data("postajax") && (!(confirmAction && (typeof confirmAction) === 'function') || confirmAction())) {
						$.ajax({
							"url": dataAction,
							"type": datas.method || "get",
							"async": false,
							"data": datas.data,
						}).success(function (data, textStatus, jqXHR) { // .done
							logger.debug('textStatus', textStatus);
							logger.trace('jqXHR', jqXHR);
							onResponseData = data;
						}).error(function (jqXHR, textStatus, errorThrown) { // .fail
							logger.debug('textStatus', textStatus);
							logger.trace('errorThrown', errorThrown, jqXHR);
							onResponseData = null;
						});
					} else {
						logger.warn("No .postajax or canceled");
						return false;
					}
					var f = $(this).data("onclick") || function () {};
					$(this).data("onclick", "");
					$(this).css('pointer-events', 'none');
					$(this).css('cursor', 'default');
					setTimeout(function () {
						f();
						if (onResponse && (typeof onResponse) === 'function') {
							onResponse(onResponseData);
						}
					}.bind(this), maxTimeout);
					return true;
				});
				break;
			default:
				logger.error('only form request supported here');
				return false;
		}											
	});
	return true;
};
