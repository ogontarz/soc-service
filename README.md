# soc-service

## Jak uruchomić serwis?

#### Krok 1:
Zainstalować [nodejs](https://nodejs.org/en/) w wersji 8.11.3.

Wersję zainstalowanego node'a można sprawdzić z konsoli komendą:
```node --version```.
Automatycznie powienien zainstalować się również manager pakietów npm. ```npm --version``` powinno zwrócić wersję 5.6.0.


#### Krok 2:
Uruchomić syslog server oraz (opcjonalnie, patrz krok 4) zainstalować i uruchomić [elasticsearcha](https://www.elastic.co/downloads/elasticsearch).


#### Krok 3:
Pobrać kod źródłowy w paczce .zip i wypadkować w wybranym folderze na dysku. Paczkę można pobrać klikając zielony przycisk "Clone or download" znajdujący się ponad wykazem plików źródłowych na niniejszej stronie.



#### Krok 4:
Otworzyć plik config.json w edytorze tekstowym i ustawić w nim wybraną konfigurację projektu. 

Plik config.json zawiera dwie sekcje: elastic oraz syslog. W każdej z nich należy wpisać odpowiednie wartości adresów ip oraz portów, na których działają uruchomione usługi. W przypadku, gdy ustawimy wartość pola "enable" na false, wybrana usługa nie będzie wykorzystana, a wartości wpisane w polach ip i port zostaną zignorowane.



#### Krok 5:
W konsoli przejść do katalogu, w którym znajdują się wypakowane pliki projektu i wykonać komendę:
```npm install```.

W tej chwili manager pakietów npm powinien pobrać i zainstalować wszystkie zależości projektu. W katalogu powien pojawić się nowy folder o nazwie node_modules.



#### Krok 6:
Uruchomić serwis poprzez wykonanie komendy:
```node index.js```
Serwis zostanie uruchomiony na localhost:80.




## Jak przetestować, czy serwis działa?

## Opcja 1:
Pojedyncze zapytanie.
Korzystając z 




