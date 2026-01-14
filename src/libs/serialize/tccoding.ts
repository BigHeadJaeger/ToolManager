export class TCCoding {
	public static Dig2Dec(str: string) {
		let retV = 0;
		if (str.length == 4) {
			for (let i = 0; i < 4; i++) {
				retV += eval(str.charAt(i)) * Math.pow(2, 3 - i);
			}
			return retV;
		}
		return -1;
	}
	public static Hex2Utf8(str: string) {
		let retS = "";
		let tempS = "";
		let ss = "";
		if (str.length == 16) {
			tempS = "1110" + str.substring(0, 4);
			tempS += "10" + str.substring(4, 10);
			tempS += "10" + str.substring(10, 16);
			const sss = "0123456789ABCDEF";
			for (let i = 0; i < 3; i++) {
				retS += "%";
				ss = tempS.substring(i * 8, (eval(i.toString()) + 1) * 8);
				retS += sss.charAt(this.Dig2Dec(ss.substring(0, 4)));
				retS += sss.charAt(this.Dig2Dec(ss.substring(4, 8)));
			}
			return retS;
		}
		return "";
	}
	public static Dec2Dig(n: number) {
		let s = "";
		let n2 = 0;
		for (let i = 0; i < 4; i++) {
			n2 = Math.pow(2, 3 - i);
			if (n >= n2) {
				s += '1';
				n = n - n2;
			}
			else
				s += '0';
		}
		return s;
	}

	public static Str2Hex(str: string) {
		let c = "";
		let n;
		const ss = "0123456789ABCDEF";
		let digS = "";
		for (let i = 0; i < str.length; i++) {
			c = str.charAt(i);
			n = ss.indexOf(c);
			digS += this.Dec2Dig(eval(n));
		}
		return digS;
	}
	public static Gb2312ToUtf8(str: string) {
		const s = escape(str);
		const sa = s.split("%");
		let retV = "";
		if (sa[0] != "") {
			retV = sa[0];
		}
		for (let i = 1; i < sa.length; i++) {
			if (sa[i].substring(0, 1) == "u") {
				retV += this.Hex2Utf8(this.Str2Hex(sa[i].substring(1, 5)));
				if (sa[i].length) {
					retV += sa[i].substring(5);
				}
			}
			else {
				retV += unescape("%" + sa[i]);
				if (sa[i].length) {
					retV += sa[i].substring(5);
				}
			}
		}
		return retV;
	}
	public static Utf8ToGb2312(str: string) {
		let substr = "";
		let a = "";
		let b = "";
		let c = "";
		let i = -1;
		i = str.indexOf("%");
		if (i == -1) {
			return str;
		}
		while (i != -1) {
			if (i < 3) {
				substr = substr + str.substr(0, i - 1);
				str = str.substr(i + 1, str.length - i);
				a = str.substr(0, 2);
				str = str.substr(2, str.length - 2);
				if ((parseInt("0x" + a) & 0x80) == 0) {
					substr = substr + String.fromCharCode(parseInt("0x" + a));
				}
				else if ((parseInt("0x" + a) & 0xE0) == 0xC0) { //two byte  
					b = str.substr(1, 2);
					str = str.substr(3, str.length - 3);
					var widechar = (parseInt("0x" + a) & 0x1F) << 6;
					widechar = widechar | (parseInt("0x" + b) & 0x3F);
					substr = substr + String.fromCharCode(widechar);
				}
				else {
					b = str.substr(1, 2);
					str = str.substr(3, str.length - 3);
					c = str.substr(1, 2);
					str = str.substr(3, str.length - 3);
					var widechar = (parseInt("0x" + a) & 0x0F) << 12;
					widechar = widechar | ((parseInt("0x" + b) & 0x3F) << 6);
					widechar = widechar | (parseInt("0x" + c) & 0x3F);
					substr = substr + String.fromCharCode(widechar);
				}
			}
			else {
				substr = substr + str.substring(0, i);
				str = str.substring(i);
			}
			i = str.indexOf("%");
		}

		return substr + str;
	}
}