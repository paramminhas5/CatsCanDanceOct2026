"""Builds public/preview/night/index.html.
base.html is the old page ("the night in four apps", artifact Gb2K9LtfVbqYiMRqo2BTJk) with the shader lines,
house rules and Episodes move already applied. skin.css goes at the end of its style block and skin.js at the
end of its script closure (the page's script is one IIFE, so new code must sit inside it).
Run from this folder: python3 make.py"""
import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(d,f)).read()
h=r('base.html')
i=h.rindex('</style>'); h=h[:i]+r('skin.css')+h[i:]
j=h.rindex('</script>'); i=h.rindex('})();',0,j); h=h[:i]+r('skin.js')+'\n'+h[i:]
out=os.path.join(d,'../../public/preview/night/index.html')
open(out,'w').write(h); print(len(h))
