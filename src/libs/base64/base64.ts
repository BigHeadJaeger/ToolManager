const _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const BASE64_VALUES = new Array<number>(123); // max char code in base64Keys

for (let i = 0; i < 123; ++i) {
    BASE64_VALUES[i] = 64; // fill with placeholder('=') index
}

for (let i = 0; i < 64; ++i) {
    BASE64_VALUES[_keyStr.charCodeAt(i)] = i;
}

export class Base64 {
	
	public static decodeAsArray(input:any, bytes:any) {
		var output : any = [],
		chr1, chr2, chr3,
		enc1, enc2, enc3, enc4,
		i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {
			enc1 = BASE64_VALUES[input.charCodeAt(i++)];
			enc2 = BASE64_VALUES[input.charCodeAt(i++)];
			enc3 = BASE64_VALUES[input.charCodeAt(i++)];
			enc4 = BASE64_VALUES[input.charCodeAt(i++)];

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output.push(String.fromCharCode(chr1));

			if (enc3 !== 64) {
				output.push(String.fromCharCode(chr2));
			}
			if (enc4 !== 64) {
				output.push(String.fromCharCode(chr3));
			}
		}

		var dec = output.join('');

		var ar : any = [], j, len;
		for (i = 0, len = dec.length / bytes; i < len; i++) {
			ar[i] = 0;
			for (j = bytes - 1; j >= 0; --j) {
				ar[i] += dec.charCodeAt((i * bytes) + j) << (j * 8);
			}
		}
	
		return ar;
	};

	public static encodeArray(input:any) : string {
		let t = "";
		let n, r, i, s, o, u, a;
		let f = 0;

		while (f < input.length) {
			n = input[f++];
			r = input[f++];
			i = input[f++];
			s = n >> 2;
			o = (n & 3) << 4 | r >> 4;
			u = (r & 15) << 2 | i >> 6;
			a = i & 63;
			if (isNaN(r)) {
				u = a = 64;
			} else if (isNaN(i)) {
				a = 64;
			}
			t = t + _keyStr.charAt(s) + _keyStr.charAt(o) + _keyStr.charAt(u) + _keyStr.charAt(a);
		}
		return t;
	}

	public static encode(input:string) : string {
		let t = "";
		let n, r, i, s, o, u, a;
		let f = 0;
		input = this._utf8_encode(input);
		while (f < input.length) {
			n = input.charCodeAt(f++);
			r = input.charCodeAt(f++);
			i = input.charCodeAt(f++);
			s = n >> 2;
			o = (n & 3) << 4 | r >> 4;
			u = (r & 15) << 2 | i >> 6;
			a = i & 63;
			if (isNaN(r)) {
				u = a = 64;
			} else if (isNaN(i)) {
				a = 64;
			}
			t = t + _keyStr.charAt(s) + _keyStr.charAt(o) + _keyStr.charAt(u) + _keyStr.charAt(a);
		}
		return t;
	}
	public static decode(intput:string) : string {
		let t = "";
		let n, r, i;
		let s, o, u, a;
		let f = 0;
		intput = intput.replace(/[^A-Za-z0-9+/=]/g, "");
		while (f < intput.length) {
			s = _keyStr.indexOf(intput.charAt(f++));
			o = _keyStr.indexOf(intput.charAt(f++));
			u = _keyStr.indexOf(intput.charAt(f++));
			a = _keyStr.indexOf(intput.charAt(f++));
			n = s << 2 | o >> 4;
			r = (o & 15) << 4 | u >> 2;
			i = (u & 3) << 6 | a;
			t = t + String.fromCharCode(n);
			if (u != 64) {
				t = t + String.fromCharCode(r);
			}
			if (a != 64) {
				t = t + String.fromCharCode(i);
			}
		}
		t = this._utf8_decode(t);
		return t;
	}
	private static _utf8_encode(intput:string) : string {
		let t = "";
		for (let n = 0; n < intput.length; n++) {
			let r = intput.charCodeAt(n);
			if (r < 128) {
				t += String.fromCharCode(r)
			} else if (r > 127 && r < 2048) {
				t += String.fromCharCode(r >> 6 | 192);
				t += String.fromCharCode(r & 63 | 128);
			} else {
				t += String.fromCharCode(r >> 12 | 224);
				t += String.fromCharCode(r >> 6 & 63 | 128);
				t += String.fromCharCode(r & 63 | 128);
			}
		}
		return t;
	}
	private static _utf8_decode(input:string):string {
		let t = "";
		let n = 0;
		let r = 0, c2 = 0, c3;
		while (n < input.length) {
			r = input.charCodeAt(n);
			if (r < 128) {
				t += String.fromCharCode(r);
				n++;
			} else if (r > 191 && r < 224) {
				c2 = input.charCodeAt(n + 1);
				t += String.fromCharCode((r & 31) << 6 | c2 & 63);
				n += 2;
			} else {
				c2 = input.charCodeAt(n + 1);
				c3 = input.charCodeAt(n + 2);
				t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
				n += 3
			}
		}
		return t;
	}
}