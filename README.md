# rtw-weather-meter
Parse weather data from CWB.
```txt
會找不到System.Net.Http.Native.so相對應Dll
ldd System.Net.Http.Native.so 
發現很多Dll並沒有對應
安裝沒有對應的lib
sudo apt-get install libcurl3
```
```txt
dotnet 2.0目前看起來支援https request會有lib問題
HttpResponseMessage Client GetAsync會錯誤
改成http
```
