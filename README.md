# soc-service

## Co to jest?

Powyższe pliki źródłowe składają sie na prosty przejściowy mikroserwis służacy do walidacji przychodzących przez niego eventów i przesyłania ich dalej w świat. 


![soc-service](https://image.ibb.co/ewcjfz/soc_service.png)


REST API serwisu składa się z kilku endpointów:
- POST /events - umożliwia przesłanie pojedynczego eventu do systemu
- GET /schema - zwraca format schemy, według którego walidowane się przychodzące eventy
- POST /schema - pozwala na przesłanie schemy, która używana jest do walidacji, [generowanie schemy](https://github.com/olagontarz/schema-generator)
- GET /stats - zwraca uproszczone statystyki z działania serwisu od czasu jego uruchomienia - liczbę eventów, które przesłano do serwisu oraz liczbę eventów, która poprawnie przeszły walidację

Zapytania typu POST można wykonać przy użyciu zewnętrznej aplikacji np. Postman albo korzystając z programu curl. JSON, który chcemy przesłać do serwisu (czyli event albo format schemy) powienien znaleźć się w *Body* zapytania.


Format każdego przychodzącego pod */events* eventu w formacie JSON jest walidowany zgodnie z zapisaną w pamięci programu schemą. Niepoprawne eventy są ignorowane, natomiast te zgodne ze zdefiniowanym formatem są przekazywane dalej - w zależności od ustawień konfiguracyjnych - do elasticsearcha i/lub sysloga. W obu tych przypadkach, dla poprawy wydajności, został wykorzystany mechanizm kolejek, które zbierają określoną liczbę eventów, a następnie wysyłają je grupowo, "na raz". Liczba równoczesnie działających kolejek i ich pojemności jest konfigurowalna. 

W usłudze elasticsearch, każdy nowy event dodany zostanie do indeksu o nazwie *rok-miesiąc-dzień* (np. 2018-08-22) daty przejścia przez serwis.

Docelowo, serwis zostanie udostępniony jako *docker image* w [rezpozytorium Docker Hub](https://hub.docker.com/u/olagontarz/), skąd w łatwy sposób będzie można go pobrać i uruchomić.



## Jak uruchomić serwis?

#### Krok 1:
Zainstalować [nodejs](https://nodejs.org/en/) w wersji 8.11.3.

Wersję zainstalowanego node'a można sprawdzić z konsoli komendą:
```node --version```.
Jednocześnie zainstaluje się również manager pakietów npm. ```npm --version``` powinno zwrócić wersję 5.6.0.


#### Krok 2:
Uruchomić syslog server oraz (opcjonalnie, patrz krok 4) zainstalować i uruchomić usługę [elasticsearch](https://www.elastic.co/downloads/elasticsearch).



#### Krok 3:
Pobrać kod źródłowy w paczce .zip i wypakować w wybranym miejscu na dysku. Paczkę z kodem można pobrać klikając zielony przycisk *Clone or download* znajdujący się ponad wykazem plików źródłowych na niniejszej stronie.



#### Krok 4:
Otworzyć plik *config.json* w edytorze tekstowym i ustawić w nim wybraną konfigurację projektu. 

Plik *config.json* zawiera dwie sekcje: *elastic* oraz *syslog*. W każdej z nich należy wpisać odpowiednie wartości adresów ip oraz portów, na których działają uruchomione usługi. W przypadku, gdy ustawimy wartość pola *enable* na *false*, wybrana usługa nie będzie wykorzystana, a wartości wpisane w polach *ip* i *port* zostaną zignorowane. Połączenie z syslog serwerem odbywa się przez protokół TCP.



#### Krok 5:
W konsoli przejść do katalogu, w którym znajdują się wypakowane pliki projektu i wykonać komendę:
```npm install```.

W tej chwili manager pakietów npm pobierze i zainstaluje wszystkie zależości projektu. W katalogu powinien pojawić się nowy folder o nazwie *node_modules*.



#### Krok 6:
Uruchomić serwis poprzez wykonanie komendy:
```node start.js```
Serwis zostanie uruchomiony na *localhost:3000*.



## Jak przetestować działanie serwisu?

#### Opcja 1:
Pojedyncze zapytanie.


Korzystając z przeglądarki, przejść pod adres *localhost:3000* i polu tekstowym wpisać event w formacie json. Po kliknięciu przycisku *POST*, json zostanie wysłany do serwisu, a następnie, jeśli ma on poprawną strukturę, dodany do sysloga i/lub elasticsearcha (index *events*) w zależności do ustawień w *config.json*. W odpowiedzi zostanie przesłana odpowiedź *OK*. Przykładowy json poprawnie przechodzący walidację można znaleźć w pliku *test.json*. Format jsonów, które uznawane są za poprawne, zdefiniowany jest w pliku *schema.json*.



#### Opcja 2:
Wiele jednoczesnych zapytań.


W tym przypadku należy pobrać [Apache Benchmark](http://httpd.apache.org/docs/current/programs/ab.html). Po przejściu do folderu, którym znajduje się program ab, poprzez uruchomienie go z konsoli z różnymi parametrami, można dodać wiele eventów za jednym zamachem, a także przetestować szybkość obsługiwania zapytań przez serwis. Przykładowa komenda testująca:


```ab -p test.json -T application/json -n 10000 -c 100 -k http://localhost:3000/events```, gdzie: 
- *test.json* to ścieżka do pliku z json z eventem, który zostanie wysłany do serwisu w każdym zapytaniu,
- *-n 10000* oznacza, że łącznie zostanie wysłanych 10000 requestów,
- *-c 100*, to liczba jednoczesnych połaczeń symulujących różnych klientów.

Po zakończeniu testu otrzymujemy informacje o statystykach z jego wykonania.

