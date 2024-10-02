var nameList = [
  'Time','Past','Future','Dev',
  'Fly','Flying','Soar','Soaring','Power','Falling',
  'Fall','Jump','Cliff','Mountain','Rend','Red','Blue',
  'Green','Yellow','Gold','Demon','Demonic','Panda','Cat',
  'Kitty','Kitten','Zero','Memory','Trooper','XX','Bandit',
  'Fear','Light','Glow','Tread','Deep','Deeper','Deepest',
  'Mine','Your','Worst','Enemy','Hostile','Force','Video',
  'Game','Donkey','Mule','Colt','Cult','Cultist','Magnum',
  'Gun','Assault','Recon','Trap','Trapper','Redeem','Code',
  'Script','Writer','Near','Close','Open','Cube','Circle',
  'Geo','Genome','Germ','Spaz','Shot','Echo','Beta','Alpha',
  'Gamma','Omega','Seal','Squid','Money','Cash','Lord','King',
  'Duke','Rest','Fire','Flame','Morrow','Break','Breaker','Numb',
  'Ice','Cold','Rotten','Sick','Sickly','Janitor','Camel','Rooster',
  'Sand','Desert','Dessert','Hurdle','Racer','Eraser','Erase','Big',
  'Small','Short','Tall','Sith','Bounty','Hunter','Cracked','Broken',
  'Sad','Happy','Joy','Joyful','Crimson','Destiny','Deceit','Lies',
  'Lie','Honest','Destined','Bloxxer','Hawk','Eagle','Hawker','Walker',
  'Zombie','Sarge','Capt','Captain','Punch','One','Two','Uno','Slice',
  'Slash','Melt','Melted','Melting','Fell','Wolf','Hound',
  'Legacy','Sharp','Dead','Mew','Chuckle','Bubba','Bubble','Sandwich',
  'Smasher','Extreme','Multi','Universe','Ultimate','Death','Ready','Monkey',   'Elevator','Wrench','Grease','Head','Theme','Grand','Cool','Kid','Boy',
   'Girl','Vortex','Paradox'
];

export function generateName() {
  let name1 = nameList[Math.floor( Math.random() * nameList.length )];
  let name2 = nameList[Math.floor( Math.random() * nameList.length )];
  //const result = name1+' '+name2
  const result = name1
  return result
};

//https://stackoverflow.com/a/61511955
export function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

//https://gist.github.com/kiasaki/9e69449640fc1ec29e0def97e1ddd6bf
export const base32 = {
	a: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
	pad: "=",
	encode: function (s) {
		var a = this.a;
		var pad = this.pad;
		var len = s.length;
		var o = "";
		var w, c, r=0, sh=0;
		for(var i=0; i<len; i+=5) {
			// mask top 5 bits
			c = s.charCodeAt(i);
			w = 0xf8 & c;
			o += a.charAt(w>>3);
			r = 0x07 & c;
			sh = 2;

			if ((i+1)<len) {
				c = s.charCodeAt(i+1);
				// mask top 2 bits
				w = 0xc0 & c;
				o += a.charAt((r<<2) + (w>>6));
				o += a.charAt( (0x3e & c) >> 1 );
				r = c & 0x01;
				sh = 4;
			}

			if ((i+2)<len) {
				c = s.charCodeAt(i+2);
				// mask top 4 bits
				w = 0xf0 & c;
				o += a.charAt((r<<4) + (w>>4));
				r = 0x0f & c;
				sh = 1;
			}

			if ((i+3)<len) {
				c = s.charCodeAt(i+3);
				// mask top 1 bit
				w = 0x80 & c;
				o += a.charAt((r<<1) + (w>>7));
				o += a.charAt((0x7c & c) >> 2);
				r = 0x03 & c;
				sh = 3;
			}

			if ((i+4)<len) {
				c = s.charCodeAt(i+4);
				// mask top 3 bits
				w = 0xe0 & c;
				o += a.charAt((r<<3) + (w>>5));
				o += a.charAt(0x1f & c);
				r = 0;
				sh = 0;
			} 
		}
		// Calculate length of pad by getting the 
		// number of words to reach an 8th octet.
		if (r!=0) { o += a.charAt(r<<sh); }
		var padlen = 8 - (o.length % 8);
		// modulus 
		if (padlen==8) { return o; }
		if (padlen==1) { return o + pad; }
		if (padlen==3) { return o + pad + pad + pad; }
		if (padlen==4) { return o + pad + pad + pad + pad; }
		if (padlen==6) { return o + pad + pad + pad + pad + pad + pad; }
		console.log('there was some kind of error');
		console.log('padlen:'+padlen+' ,r:'+r+' ,sh:'+sh+', w:'+w);
	},
	decode: function(s) {
		var len = s.length;
		var apad = this.a + this.pad;
		var v,x,r=0,bits=0,c,o='';

		s = s.toUpperCase();

		for(i=0;i<len;i+=1) {
			v = apad.indexOf(s.charAt(i));
			if (v>=0 && v<32) {
				x = (x << 5) | v;
				bits += 5;
				if (bits >= 8) {
					c = (x >> (bits - 8)) & 0xff;
					o = o + String.fromCharCode(c);
					bits -= 8;
				}
			}
		}
		// remaining bits are < 8
		if (bits>0) {
			c = ((x << (8 - bits)) & 0xff) >> (8 - bits);
			// Don't append a null terminator.
			// See the comment at the top about why this sucks.
			if (c!==0) {
				o = o + String.fromCharCode(c);
			}
		}
		return o;
	}
};

export const base32hex = {
	a: '0123456789ABCDEFGHIJKLMNOPQRSTUV',
	pad: '=',
	encode: base32.encode,
	decode: base32.decode
};

export function getSizeUnit(size){
	let numberOfBytes = size
	  // Approximate to the closest prefixed unit
  const units = [
	"B",
	"KiB",
	"MiB",
	"GiB",
	"TiB",
	"PiB",
	"EiB",
	"ZiB",
	"YiB",
  ];
  const exponent = Math.min(
	Math.floor(Math.log(numberOfBytes) / Math.log(1024)),
	units.length - 1,
  );
  const approx = numberOfBytes / 1024 ** exponent;
  const output =
	exponent === 0
	  ? `${numberOfBytes} bytes`
	  : `${approx.toFixed(3)} ${
		  units[exponent]
		}`;
	return output
}