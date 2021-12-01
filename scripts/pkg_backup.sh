#!/bin/sh
k=$(opkg status kernel|grep me:|cut -d' ' -f2-);l=/tmp/p;opkg list-installed|awk '{print $1}'>$l
f=/etc/config/pkg_restore.sh;echo -en "#!/bin/sh\nopkg update\nopkg install ">$f;chmod +x $f
while read i;do
    t=$(opkg status $i|grep me:|cut -d' ' -f2-);s=$(opkg status $i|grep us:|grep "user");[ "$t" -ne "$k" ] && [ -n "$s" ] && echo -n "$i ">>$f
done<$l;echo>>$f;rm -f $l
