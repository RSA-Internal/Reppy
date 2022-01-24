package panda.reppy.database.cache;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;
import panda.reppy.database.models.DatabaseModel;
import panda.reppy.entities.BotMongoClient;

import java.util.ArrayList;
import java.util.List;

import static com.mongodb.client.model.Filters.eq;

public class ModelCache {

    public ModelCache() {}

    /** Will always hit DB */
    public static List<DatabaseModel> retrieveModelsByField(final String collectionName,
                                         final String fieldName,
                                         final String fieldValue) {
        System.out.printf("Fetching models that have %s:%s in %s%n", fieldName, fieldValue, collectionName);

        List<DatabaseModel> toReturn = new ArrayList<>();
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection =
                BotMongoClient.getCollectionByName(db, collectionName);

        FindIterable<DatabaseModel> models = collection.find(eq(fieldName, fieldValue));
        models.forEach(toReturn::add);

        return toReturn;
    }

    public static void saveModelData(final DatabaseModel model, final boolean cache) {
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection =
                BotMongoClient.getCollectionByName(db, model.getCollectionName());

        UpdateResult result = collection.replaceOne(eq("_id", model.getId()), model);
        if (result.getMatchedCount() > 0) {
            if (result.getModifiedCount() > 0) {
                System.out.println("Document updated.");
            } else
                System.out.println("No document updated, already up to date.");
        } else {
            collection.insertOne(model);
            System.out.printf("Saved %s to %s collection.%n", model.getId(), model.getCollectionName());
        }
    }
}