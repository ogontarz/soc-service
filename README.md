# Soc Service

## Opis

Soc Service to prosty przejściowy mikroserwis, którego zadaniem jest walidowanie przychodzących do niego requestów z logami w formacie json na podstawie zdefiniowanej uprzednio [schemy](https://json-schema.org/). 
Logi, które spełniają określone wymogi zostają następnie przekazane dalej - na chwilę obecną - do usługi syslog (skąd odczytywany jest przez docelowy system analizy ArcSight) oraz instancji bazy danych [elasticsearch](https://www.elastic.co/). Wykorzystanie każdej ze zdefiniowanych usług jest konfigurowalne. 

#### Schemat działania serwisu:

![soc-service](https://i.ibb.co/30VgX4D/soc-service.png)

Serwis przystosowany jest do działania w kontenerze Dockerowym - specyfikację obrazu opisuje zawartość pliku [Dockerfile](https://github.com/olagontarz/soc-service/blob/master/Dockerfile). Aktualny obraz programu zawsze znajduje się w [repozytorium Docker Hub](https://hub.docker.com/u/olagontarz/), skąd w łatwy sposób można go pobrać i uruchomić. 





#### REST API serwisu składa się z 3 następujących endpointów:

- *POST /schema* - pozwala na przesłanie nowej schemy, na podstawie której będą walidowane kolejne eventy.

Opis i instrukcja programu do generacji schemy na podstawie plików z definicjami typów znajdują się [tutaj](https://github.com/olagontarz/schema-generator). 

Po przesłaniu nowy plik schema zostaje zapisany w instancji bazy danych [redis](https://redis.io/) pod kluczem "schema". Ze względu na fakt, że serwis przystosowany jest do działania w kilku jednoczesnych instancjach (przy użyciu managera procesów pm2), a (dla poprawy wydajności) schema odczytywana jest z redisa tylko przy starcie programu, do poprawnego działania programu po przesłaniu nowej schemy będzie wymagany jego restart.


- *GET /schema* - zwraca aktualną schemę, która jest wykorzystywana do walidacji przychodzących eventów.


- *POST /events* - umożliwia przesłanie pojedynczego eventu do systemu.

Przesłanie poprawnie przechodzącego walidację schemą requestu skutkuje odpowiedzią z poprawnym eventem i statusie *200 OK*. W przypadku, gdy w programie brakuje schemy, przychodzące eventy są ignorowane i zwracany jest kod *200* wraz z pustym jsonem w odpowiedzi. Event niespełniający wymagań schemy również zostanie pominięty, a w odpowiedzi pojawi się kod *400 Bad Request*.

Każdy poprawny event zostanie następnie przesłany do każdej z zarejestrowanych usług - w zależności od konfiguracji - do sysloga i/lub elasticsearcha. Dla poprawy wydajności, wykorzystany został mechanizm kolejek, które najpierw zbierają określoną liczbę eventów lub odczekują odpowiednio określony czas (aktualnie jest to 5 sekund), a następnie wysyłają swoje zawartości grupowo, "na raz". Liczba równocześnie działających kolejek i ich pojemności jest konfigurowalna. 

W przypadku sysloga eventy wysłane są poprzez mechanizm socketów po uprzedniej ich kanonizacji. 
W bazie elasticsearch nowe eventy zostają dodane do indeksu o nazwie *rok-miesiąc-dzień* (np. 2018-08-22) daty przejścia przez serwis.



Do celów testowych udostępniona została możliwość przesyłania nowego eventu oraz aktualizowanie schemy z poziomu przeglądarki. Pod adresami */* oraz */schema/update* w przeglądarce pojawia się okno tekstowe z przyciskiem *POST* pozwalającym na wysłanie odpowiednio nowego eventu bądź aktualizacji schemy.





#### Konfiguracja:

Do poprawnego uruchomienia programu niezbędne jest ustawienie niezbędnych zmiennych środowiskowych w systemie lub uruchomienie programu z plikiem z danymi o porcie, na którym ma zostać uruchomiony serwis oraz o konfiguracji redisa, sysloga i elasticsearcha. 

Przykładowa konfiguracja serwisu znajduje się w pliku [example.env](https://github.com/olagontarz/soc-service/blob/master/example.env). 

W przypadku ustawienia wartości *USE_SYSLOG* i/lub *USE_ELASTIC* na *true*, dodatkowo należy podać hosta i numer portu, na którym uruchomiona jest usługa. Przy wartości *false* dana usługa nie będzie wykorzystana, a więc parametry *host* i *port* zostaną zignorowane. 




## Uruchomienie serwisu:

Aby uruchomić serwis na wybranej maszynie (z zainstalowanym Dockerem) należy:

* pobrać obraz z Docker Hub: ```docker pull olagontarz/soc-service```

lub 

* przy braku dostępu do internetu, pobrać obraz tą samą metodą, a następnie zapisać go do pliku z rozszerzeniem .docker: ```docker save -o soc-service.docker olagontarz/soc-service``` oraz przenieść go na wybrane środowisko i wgrać do pamięci: ```docker load -i soc-service.docker```

* przygotować plik konfiguracyjny *.env* z paramaterami do połączenia z redisem, syslogiem i/lub elasticsearchem zgodnie z przykładem [example.env](https://github.com/olagontarz/soc-service/blob/master/example.env).

* uruchomić serwis z odpowiednim mapowaniem portów (zgodnym z zawartością plików .env i Dockerfile) oraz ścieżką do pliku z konfiguracją środowiska: ```docker run -p 3000:3000 --env-file .env soc-service```


Serwis uruchomi się na localhost:3000.


Po uruchomieniu, ze względu na wykorzystanie [managera procesów pm2](http://pm2.keymetrics.io/), zostaną otwarte 4 instancje serwisu, pomiędzy które rozdzielany będzie przychodzący ruch. Logi z działania wszystkich instancji zostaną połączone w jeden zgodnie z ustawieniami w pliku konfiguracyjnym [pm2.json](https://github.com/olagontarz/soc-service/blob/master/pm2.json), ale będą rozróżniane zmienną INSTANCE_ID. Serwis loguje przychodzące requesty z wykorzystaniem biblioteki Morgan - zapisywane są wiersze w postaci:

```timestamp instance_id method_url response_status - response_time_ms - response_length - remote_address```

Dodatkowo zalogowane zostaną początkowe informacje o poprawnej konfiguracji połączenia do redisa, sysloga i/lub elasticsearcha.
Domyślnie logi zostaną wypisane konsolę wywołania programu, co można zmienić [przekierowując stdout i stderr programu](https://stackoverflow.com/questions/7526971/how-to-redirect-both-stdout-and-stderr-to-a-file) do wybranego pliku/ów.



## Testy za pomocą Apache Benchmark


W tym przypadku należy pobrać program [Apache Benchmark](http://httpd.apache.org/docs/current/programs/ab.html). Po przejściu do folderu, którym znajduje się program ab, poprzez uruchomienie go z konsoli z różnymi parametrami, można wysłać wiele requestów "na raz", a przy tym przetestować szybkość obsługiwania zapytań przez serwis. Przykładowa komenda testująca:


```ab -p test.json -T application/json -n 10000 -c 100 -k http://localhost:3000/events```, gdzie: 
- *test.json* to ścieżka do pliku z json z eventem, który zostanie wysłany do serwisu w każdym zapytaniu,
- *-n 10000* oznacza, że łącznie zostanie wysłanych 10000 requestów,
- *-c 100*, to liczba jednoczesnych połączeń symulujących różnych klientów.

Po zakończeniu testu otrzymujemy informacje o statystykach z jego wykonania, w tym główny parametr - liczbę req/sek.

