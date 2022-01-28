function andThenMakeSmartLink (oldMarker, newMarker, confirmAction, afterAction) {
	if (!oldMarker || !newMarker || oldMarker == newMarker || !oldMarker.startsWith('#') || !newMarker.startsWith('#')) {
		return false;
	}
	oldMarker = oldMarker.substring(1);
	newMarker = newMarker.substring(1);
	$('a[href$="#'+oldMarker+'"]').each(function (i, e) {
		var t = $(e);
		var datas = t.data();
		//logger.debug(datas);
		
		var requestType = datas.requestType;
		if (requestType !== 'form') {
			logger.error('only form request supported here');
			return false;
		}
		
		var ar = (''+e.href).split('#');
		var dataAction = ar[0]; // href
		t.attr('href', dataAction+'#'+newMarker);
		
		var frname = 'dummyframe';
		var fr = $('iframe#'+frname)[0] || $('iframe[name="'+frname+'"]')[0];
		if (!fr) {
			fr = $('<iframe name="'+frname+'" id="'+frname+'" style="display: none;"></iframe>');
			$('body').append(fr);
		}
		frname = $(fr).attr('name');
		
		var $form = $("<form></form>").attr({ method: datas.method || "get", action: dataAction, target: frname}).css("display","none");
		
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
		
			for (var key in datas.data) {
				$form.append($("<input/>").attr({type: "hidden", name: key, value: datas.data[key]}));
			}
		}
		$('body').append($form);
		t.data("onclick", e.onclick);
		e.onclick = 'return false;';
		t.data("postform",$form);											
	}).click(function (ev) {
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
			if (afterAction && (typeof afterAction) === 'function') {
				afterAction();
			}
		}.bind(this), 500);
		return true;
	});
	return true;
};
