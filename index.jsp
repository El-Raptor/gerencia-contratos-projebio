<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerência de Contratos</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">

    <!-- CSS Modularizado -->
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/base.css">
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/dashboard.css">
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/card.css">
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/chart.css">
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/table.css">
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/src/css/filter-drawer.css">

    <snk:load />
</head>

<body>
    <!-- Sem sidebar, apenas o container principal -->
    <main id="app-root"></main>

    <script>
        window.APP_BASE_FOLDER = "${BASE_FOLDER}";
    </script>

    <!-- Lib para Gráficos -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Orquestrador principal -->
    <script type="module" src="${BASE_FOLDER}/src/main.js"></script>
</body>
</html>