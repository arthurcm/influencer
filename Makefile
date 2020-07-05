-include mk/Makefile.rules
SHELL := /bin/bash
PWD = $(shell pwd)
PATH := ${PATH}:/root/protoc/bin


PROTO_SRC := protos
PROTO_SRC_LIST := $(SHELL find ./${PROTO_SRC_BASE}/* -maxdepth 1 -type d | rev | cut -d '/' -f1 | rev)
PROTO_OUT_DIR := proto_gen

CAMPAIGN_API_JS_DIR := cloud_run_api_nodejs


#UTILS := ./utils
INSTALL_ARGS :=
# By default, the deploy mode is prod. To make with dev deploy mode, do
# ```
# make DEPLOY_MODE=dev
# ```
ifndef DEPLOY_MODE
    DEPLOY_MODE := dev
endif


## proto_js               : Compile protocol buffer for js
proto_js:
	$(MKDIR) -p ${PROTO_OUT_DIR}
	protoc --proto_path=${PROTO_SRC} --js_out=import_style=commonjs,binary:${PROTO_OUT_DIR}  ${PROTO_SRC}/*.proto
	$(CP) -rf ./${PROTO_OUT_DIR} ${CAMPAIGN_API_JS_DIR}/.


## clean                  : Delete all the object files and executables(proto_gen)
clean:
	$(RM) -rf ${PROTO_OUT_DIR}/*.js
	$(RM) -rf ${CAMPAIGN_API_JS_DIR}/${PROTO_OUT_DIR}/*.js


help: Makefile
	@sed -n 's/^##//p' $<
