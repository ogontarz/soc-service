FROM registry.access.redhat.com/rhel7/rhel:latest
 
RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
RUN yum install -y nodejs
 
# Create app directory
RUN mkdir -p /usr/src/app/
WORKDIR /usr/src/app/
 
RUN npm install pm2 -g

# Install app dependencies
COPY package*.json /usr/src/app/
RUN npm install
 
# Bundle app source
COPY . /usr/src/app/

EXPOSE 3000

# Start the service 
CMD [ "pm2-runtime", "start", "pm2.json" ]