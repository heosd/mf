Mobilnet Javascript library Written by hsd
 - one way data binding library
 - use template to create the elements.

Version 0.5 2015/04/20
 - $(Select).MF_BindSimple();
 - $(Select).MF_BindRepeat();
 - $(Select).MF_BindSelect();
 - examples : http://www.sdlabs.kr/mf/
 - no minified version available now

Version 0.6 2015/05/10
 - bindPagination(), in SKAcademy MobilnetDev
 - do not use name dataSource like this : mf-data-source="dataSource", it confuses name inside!
 - MF_BindDataHelper changed local variable name dataSource to $dataSource, b/c eval duplication

Version 0.6 2015/05/11
 - mf-blank-space option added
 - appending children will have no blank space among them so put " " after them, also pagination works well!
 - bindPagination, invalid zero exception handled -> show the "1"

2015/05/21
 - custom attribute mf-src="http://aaa.gif" added
 - since src="blah.png" will cause the 404 not found error it just replace that
!- IMPORTANT : Switched custom attributes / bracket binding order b/c bracket will change the custom attribute's original name!

2015/05/25
!- IMPORTANT : mf-break="true" attribute added
 - not a custom attribute, same level with mf-condition. decide "APPEND" or not, I forgot why I made this!
!- IMPORTATN : mf-derived="string" attribute added. good to use with nested binding situation like parent's key
 - nested binding can use that, ajax binding not tested!