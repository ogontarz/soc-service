# Soc Service

## Opis

Soc Service to prosty przejściowy mikroserwis, którego zadaniem jest walidowanie przychodzących do niego requestów z logami w formacie json na podstawie zdefiniowanej uprzednio [schemy](https://json-schema.org/). 
Logi, które spełniają określone wymogi zostają następnie przekazane dalej - na chwilę obecną - do usługi syslog (skąd odczytywany jest przez docelowy system analizy ArcSight) oraz instancji bazy danych [elasticsearch](https://www.elastic.co/). Wykorzystanie każdej ze zdefiniowanych usług jest konfigurowalne. 

#### Schemat działania serwisu:

![soc-service](https://i.ibb.co/M8XCmw8/soc-service.jpg)

Serwis przystosowany jest do działania w kontenerze Dockerowym. Aktualny obraz programu zawsze znajduje się w [rezpozytorium Docker Hub](https://hub.docker.com/u/olagontarz/), skąd w łatwy sposób można go pobrać i uruchomić. 



#### REST API serwisu składa się z 3 następujących endpointów:

- *POST /schema* - pozwala na przesłanie nowej schemy, na podstawie której będą walidowane kolejne eventy. Wymaga restartu serwisu. 

Opis i instrukcja programu do generacji schemy na podstawie plików z definicjami typów znajdują się [tutaj](https://github.com/olagontarz/schema-generator). 

Po przesłaniu nowy plik schema zostaje zapisany w instancji bazy danych redis pod kluczem "schema". Ze względu na fakt, że serwis przystosowany jest do działania w kilku jednoczesnych instancjach (przy użyciu managera procesów pm2), a schema odczytywana jest z redisa tylko przy starcie programu (dla poprawy wydajności), do poprawnego działania programu po przesłaniu nowej schemy będzie wymagany jego restart.


- *GET /schema* - zwraca aktualną schemę, która jest wykorzystywana do walidacji przychodzących eventów.


- *POST /events* - umożliwia przesłanie pojedynczego eventu do systemu.

Przesłanie poprawnie przechodzącego walidację schemą eventu skutkuje odpowiedzią z poprawnym eventem i statusie 200 OK. W przypadku, gdy w programie brakuje schemy, przychodzące eventy są ignorowane i zwracany jest kod 200 wraz z pustym jsonem w odpowiedzi. Event niespełniający wymagań schemy również zostanie pominięty, a w odpowiedzi pojawi się kod 400 Bad Request.

Każdy poprawny event zostanie następnie przesłany do każdej z zarejestowalnych usług - w tym przypadku do sysloga i/lub (w zależności od konfiguracji) elasticsearcha. Dla poprawy wydajności, wykorzystany został mechanizm kolejek, które najpierw zbierają określoną liczbę eventów lub odczekują odpowiednio określony czas (aktualnie jest to 5 sekund), a następnie wysyłają swoje zawartości grupowo, "na raz". Liczba równocześnie działających kolejek i ich pojemności jest konfigurowalna. 

W przypadku sysloga eventy wysłane są poprzez mechanizm socketów po uprzedniej kanonizacji. 
W bazie elasticsearch nowe eventy zostają dodane do indeksu o nazwie *rok-miesiąc-dzień* (np. 2018-08-22) daty przejścia przez serwis.



Do celów testowych udostępniona została możliwość przesyłania nowego eventu oraz aktualizowanie schemy z poziomu przeglądarki. Pod adresami */* oraz */schema/update* w przeglądarce pojawia się okno tekstowe z przyciskiem *POST* pozwalającym na wysłanie requestu.


#### Konfiguracja:





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

