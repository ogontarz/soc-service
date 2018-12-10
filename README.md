# soc-service

## Co to jest?

Soc Service to prosty przejściowy mikroserwis, którego zadaniem jest walidowanie przychodzących do niego requestów z logami w formacie json na podstawie zdefiniowanej uprzednio [schemy](https://json-schema.org/). 
Logi, które spełniają określone wymogi zostają następnie przekazane dalej - na chwilę obecną - do usługi syslog (skąd ocztywywany jest przez docelowy system analizy ArcSight) oraz instancji bazy danych elasticsearch. Użycie każdej ze zdefiniowanych usług jest konfigurowalne.

Schemat działania serwisu:

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
Zainstalować program [Docker](https://docs.docker.com/install/).

Zweryfikować poprawną instalację komendami:
```docker --version```
oraz
```docker info```


#### Krok 2:
Uruchomić syslog server oraz (opcjonalnie, patrz krok 4) zainstalować i uruchomić [elasticsearch](https://www.elastic.co/downloads/elasticsearch).



#### Krok 3:

Przygotować plik konfiguracyjny z parametrami uruchomienia serwisu.

Utworzyć nowy plik tekstowy o nazwie *.env* i uzupełnić w nim informację o porcie, na którym ma zostać uruchomiony serwis, o środowisku (tryb *debug* powoduje wysiwetlanie dodatkowych logów podczas działania serwisu) oraz konfiguracji sysloga i elasticsearcha. W przypadku ustawienia wartości *elastic* i/lub *syslog* na *true*, dodatkowo należy podać hosta i numer portu, na którym uruchomiona jest usługa. Przy wartości *false* dana usługa nie będzie wykorzystana, a jej parametry *host* i *port* zostaną zignorowane. 

Przykład:
```
NODE_ENV=test

APP_PORT=3000
APP_DEBUG=true

QUEUE_NUMBER=20
QUEUE_SIZE=2000

REDIS_HOST='localhost'
REDIS_PORT=6379

SYSLOG_USE=true
SYSLOG_HOST='localhost'
SYSLOG_PORT=514

ELASTIC_USE=false
ELASTIC_HOST='localhost'
ELASTIC_PORT=9200
```


#### Krok 4:

Docker image zbudowany z kodu źródłowego znajduję się w Docker Hub pod adresem: https://hub.docker.com/r/olagontarz/soc-service/

##### W przypadku maszyny z dostępem do internetu:

Uruchomić serwis komendą *docker run* z odpowiednim portem jako argumentem *-p*, ścieżką do pliku z konfiguracją *.env* oraz adresem obazu w Docker Hub.

Przykład:
```
docker run -p 3000:3000 --env-file .env olagontarz/soc-service
```


##### W przypadku braku dostępu do internetu:

Pobrać obraz na innym urządzeniu (z zainstalowanym Dockerem i z połączeniem z siecią) komendą:
```
docker save -o soc-service.docker olagontarz/soc-service
```
Przenieść powstały plik *soc-service.docker* na docelową maszynę i wczytać do pamięci:
```
docker load -i soc-service.docker
```
A następnie uruchomić analogicznie jak w opcji z dostępem do internetu:
```
docker run -p 3000:3000 --env-file .env olagontarz/soc-service
```
Serwis zostanie uruchomiony na wybranym w konfiguracji porcie na localhost.



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

